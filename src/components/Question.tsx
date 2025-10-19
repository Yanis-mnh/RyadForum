import { ChevronDown, ChevronUp, MessageSquare } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import supabase from "../lib/supabase";
import { Reponse as ReponseType } from "../types";

interface QuestionProps {
  questionText: string;
  questionId: string;
  children?: React.ReactNode;
}

const Question: React.FC<QuestionProps> = ({
  questionText,
  questionId,
  children,
}) => {
  const [open, setOpen] = useState(false);

  const [responses, setResponses] = useState<ReponseType[]>([]);
  const [loadingResponses, setLoadingResponses] = useState(false);

  const [hasResponses, setHasResponses] = useState<boolean | null>(null);
  const [checkingResponses, setCheckingResponses] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [newReply, setNewReply] = useState("");
  const [sending, setSending] = useState(false);

  // check if there are responses (cheap check)
  useEffect(() => {
    let mounted = true;
    const check = async () => {
      try {
        setCheckingResponses(true);
        const res = await supabase
          .from("responses")
          .select("id")
          .eq("question_id", questionId)
          .limit(1);

        if (res.error) {
          console.warn("check responses exist error:", res.error);
          if (mounted) setHasResponses(false);
        } else {
          const rows = (res.data || []) as any[];
          if (mounted) setHasResponses(rows.length > 0);
        }
      } catch (err) {
        console.warn("checkResponses exception:", err);
        if (mounted) setHasResponses(false);
      } finally {
        if (mounted) setCheckingResponses(false);
      }
    };
    check();
    return () => {
      mounted = false;
    };
  }, [questionId]);

  const fetchResponses = async () => {
    try {
      setLoadingResponses(true);
      const res = await supabase
        .from("responses")
        .select(
          `id, question_id, author_id, content, created_at, author:profiles(id, username)`
        )
        .eq("question_id", questionId)
        .order("created_at", { ascending: true });

      if (res.error) {
        console.error("fetch responses error:", res.error);
        return;
      }

      const rows = (res.data || []) as any[];
      const normalized: ReponseType[] = rows.map((r) => {
        const rawAuthor = r.author;
        const authorObj =
          Array.isArray(rawAuthor) && rawAuthor.length > 0
            ? rawAuthor[0]
            : rawAuthor || undefined;

        return {
          id: r.id,
          question_id: r.question_id,
          author_id: r.author_id,
          content: r.content,
          created_at: r.created_at,
          author: authorObj
            ? { id: authorObj.id ?? "", username: authorObj.username ?? "" }
            : undefined,
        } as ReponseType;
      });

      setResponses(normalized);
    } catch (err) {
      console.error("fetchResponses exception:", err);
    } finally {
      setLoadingResponses(false);
    }
  };

  const openReplyModal = () => {
    setNewReply("");
    setModalVisible(true);
  };

  const ensureProfileExists = async (
    userId: string,
    usernameFallback?: string
  ) => {
    try {
      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", userId)
        .limit(1);
      if (!existing || (Array.isArray(existing) && existing.length === 0)) {
        await supabase.from("profiles").upsert(
          [
            {
              id: userId,
              username: usernameFallback ?? `user_${userId.slice(0, 6)}`,
            },
          ],
          { onConflict: "id" }
        );
      }
    } catch (err) {
      console.warn("ensureProfileExists warning:", err);
    }
  };

  const sendReply = async () => {
    if (!newReply.trim()) {
      Alert.alert("Erreur", "Écris quelque chose avant d'envoyer.");
      return;
    }
    try {
      setSending(true);
      const userRes = await supabase.auth.getUser();
      const userId = userRes.data.user?.id;
      const fallbackUsername =
        userRes.data.user?.user_metadata?.full_name ?? undefined;

      if (!userId) {
        Alert.alert("Erreur", "Vous devez être connecté pour répondre.");
        setModalVisible(false);
        return;
      }

      await ensureProfileExists(userId, fallbackUsername);

      const insertRes = await supabase
        .from("responses")
        .insert({
          question_id: questionId,
          content: newReply.trim(),
          author_id: userId,
        })
        .select(
          `id, content, question_id, author_id, created_at, author:profiles(id, username)`
        );

      if (insertRes.error) {
        console.error("insert response error:", insertRes.error);
        Alert.alert(
          "Erreur",
          insertRes.error.message || "Impossible d'ajouter la réponse."
        );
        return;
      }

      const inserted = (insertRes.data || [])[0] as any;
      const rawAuthor = inserted?.author;
      const authorObj =
        Array.isArray(rawAuthor) && rawAuthor.length > 0
          ? rawAuthor[0]
          : rawAuthor || undefined;

      const created: ReponseType = {
        id: inserted.id,
        question_id: inserted.question_id,
        author_id: inserted.author_id,
        content: inserted.content,
        created_at: inserted.created_at,
        author: authorObj
          ? { id: authorObj.id ?? "", username: authorObj.username ?? "" }
          : undefined,
      };

      setResponses((prev) => [...prev, created]);
      setHasResponses(true);
      setModalVisible(false);

      if (!open) {
        setOpen(true);
      }
    } catch (err) {
      console.error("sendReply error:", err);
      Alert.alert("Erreur", "Impossible d'envoyer la réponse.");
    } finally {
      setSending(false);
    }
  };

  // toggle: si on ouvre, on fetch les reponse baby
  const handleToggle = async () => {
    if (!hasResponses) return;
    if (!open && responses.length === 0) {
      await fetchResponses();
    }
    setOpen((s) => !s);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity activeOpacity={0.85} style={styles.titleTouchable}>
          <Text style={styles.question} numberOfLines={2}>
            {questionText}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={async () => {
            const userRes = await supabase.auth.getUser();
            const userId = userRes.data.user?.id;

            if (!userId) {
              Alert.alert("U NEED TO BE LOGIN TO ANSWER :) ");
              return;
            }

            openReplyModal();
          }}
          style={styles.quickReplyBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MessageSquare size={18} color="#fff" />
        </TouchableOpacity>

        {checkingResponses ? (
          <ActivityIndicator style={{ marginLeft: 10 }} size="small" />
        ) : hasResponses ? (
          <TouchableOpacity onPress={handleToggle} style={{ marginLeft: 8 }}>
            {open ? (
              <ChevronUp color="#333" size={22} />
            ) : (
              <ChevronDown color="#333" size={22} />
            )}
          </TouchableOpacity>
        ) : null}
      </View>

      {open && (
        <View style={styles.inner}>
          {loadingResponses && (
            <ActivityIndicator style={{ marginVertical: 8 }} />
          )}

          {responses.length > 0 ? (
            responses.map((r) => (
              <View key={r.id} style={styles.responseWrapper}>
                <View style={styles.responseRow}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {r.author?.username
                        ? r.author.username.charAt(0).toUpperCase()
                        : "A"}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.responseAuthor}>
                      {r.author?.username ?? "Anonyme"}
                    </Text>
                    <Text style={styles.responseContent}>{r.content}</Text>
                    <Text style={styles.responseMeta}>
                      {r.created_at
                        ? new Date(r.created_at).toLocaleString()
                        : ""}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.noResponsesText}>
              Pas encore de réponses sois le premier !!!!!
            </Text>
          )}
        </View>
      )}

      {/* Modal reply */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Écrire une réponse</Text>
            <TextInput
              value={newReply}
              onChangeText={setNewReply}
              placeholder="Votre réponse..."
              multiline
              style={styles.modalInput}
              editable={!sending}
            />
            <TouchableOpacity
              style={[styles.modalBtn, sending ? { opacity: 0.8 } : {}]}
              onPress={sendReply}
              disabled={sending}
            >
              {sending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.modalBtnText}>Envoyer</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={{ marginTop: 10 }}
              onPress={() => setModalVisible(false)}
            >
              <Text style={{ color: "#2b6ef6", textAlign: "center" }}>
                Annuler
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default Question;

const styles = StyleSheet.create({
  container: {
    width: "100%",
    padding: 14,
    backgroundColor: "#ffffff",
    borderRadius: 14,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: "#eef2f7",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  titleTouchable: { flex: 1, paddingRight: 8 },
  question: { fontSize: 16, fontWeight: "700", color: "#0f172a" },

  quickReplyBtn: {
    marginLeft: 8,
    backgroundColor: "#2563eb",
    width: 36,
    height: 36,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
  },

  inner: { marginTop: 12 },

  responseWrapper: {
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  responseRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#e2e8f0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  avatarText: { fontWeight: "700", color: "#0f172a" },
  responseAuthor: { fontWeight: "700", color: "#0f172a", marginBottom: 4 },
  responseContent: { color: "#0b1220" },
  responseMeta: { fontSize: 11, color: "#6b7280", marginTop: 6 },

  noResponsesText: {
    color: "#6b7280",
    fontStyle: "italic",
    marginVertical: 8,
  },

  replyBtnText: { color: "#fff", fontWeight: "700" },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "92%",
    backgroundColor: "#fff",
    padding: 18,
    borderRadius: 12,
  },
  modalTitle: { fontWeight: "700", fontSize: 16, marginBottom: 10 },
  modalInput: {
    backgroundColor: "#f2f4f7",
    padding: 12,
    borderRadius: 10,
    height: 110,
    textAlignVertical: "top",
    marginBottom: 12,
  },
  modalBtn: {
    backgroundColor: "#2563eb",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  modalBtnText: { color: "#fff", fontWeight: "700" },
});
