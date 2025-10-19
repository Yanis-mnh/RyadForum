import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Question from "../../components/Question";
import Reponse from "../../components/Reponse";
import supabase from "../../lib/supabase";
import { QuestionRow, Question as QuestionType } from "../../types";

function useSupabaseAuth() {
  const [user, setUser] = useState<any>(null);
  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
    };
    getUser();
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user || null);
      }
    );
    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);
  return user;
}

interface ReponseType {
  id: string;
  question_id: string;
  author_id?: string | null;
  content: string;
  created_at?: string;
  author?: { id?: string; username?: string } | null;
}

export default function HomeScreen({ navigation }: any) {
  const user = useSupabaseAuth();
  const [firstLetter, setFirstLetter] = useState("?");
  const [questions, setQuestions] = useState<QuestionType[]>([]);
  const [reponses, setReponses] = useState<Record<string, ReponseType[]>>({});
  const [loadingReponses, setLoadingReponses] = useState<
    Record<string, boolean>
  >({});
  const [showReplies, setShowReplies] = useState<Record<string, boolean>>({});
  const [modalVisible, setModalVisible] = useState(false);
  const [currentQuestionId, setCurrentQuestionId] = useState<string | null>(
    null
  );
  const [newReponseText, setNewReponseText] = useState("");

  useEffect(() => {
    fetchQuestions();
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("questions-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "questions" },
        () => {
          fetchQuestions();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("responses-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "responses" },
        (payload) => {
          const questionId =
            payload.new?.question_id || payload.old?.question_id;
          if (questionId) fetchReponses(questionId);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (user?.user_metadata?.username) {
      setFirstLetter(user.user_metadata.username.charAt(0).toUpperCase());
    } else {
      setFirstLetter("?");
    }
  }, [user]);

  const fetchQuestions = async () => {
    try {
      const res = await supabase
        .from("questions")
        .select(`id, title, content, author_id, theme_id, created_at`)
        .order("created_at", { ascending: false });
      if (res.error) return;
      const rows = (res.data || []) as QuestionRow[];
      const normalized = rows.map((r) => {
        const author = r.author?.[0];
        const theme = r.theme?.[0];
        return {
          id: r.id,
          title: r.title,
          content: r.content,
          author_id: r.author_id ?? undefined,
          theme_id: r.theme_id ?? undefined,
          created_at: r.created_at,
          author: author
            ? { id: author.id ?? "", username: author.username ?? "" }
            : undefined,
          theme: theme
            ? { id: theme.id ?? "", name: theme.name ?? "" }
            : undefined,
        } as QuestionType;
      });
      setQuestions(normalized);
    } catch (err) {}
  };

  const fetchReponses = async (questionId: string) => {
    try {
      setLoadingReponses((prev) => ({ ...prev, [questionId]: true }));
      const res = await supabase
        .from("responses")
        .select("id, question_id, content, created_at")
        .eq("question_id", questionId)
        .order("created_at", { ascending: true });
      if (res.error) return;
      const rows = (res.data || []) as any[];
      const normalized: ReponseType[] = rows.map((r) => {
        const authorArr = r.author ?? [];
        const authorObj = authorArr.length > 0 ? authorArr[0] : undefined;
        return {
          id: r.id,
          question_id: r.question_id,
          author_id: r.author_id ?? undefined,
          content: r.content,
          created_at: r.created_at,
          author: authorObj
            ? { id: authorObj.id ?? "", username: authorObj.username ?? "" }
            : undefined,
        } as ReponseType;
      });
      setReponses((prev) => ({ ...prev, [questionId]: normalized }));
      setShowReplies((prev) => ({ ...prev, [questionId]: true }));
    } catch (err) {
    } finally {
      setLoadingReponses((prev) => ({ ...prev, [questionId]: false }));
    }
  };

  const toggleReplies = (questionId: string) => {
    const currentlyShown = !!showReplies[questionId];
    if (currentlyShown) {
      setShowReplies((prev) => ({ ...prev, [questionId]: false }));
    } else {
      if (!reponses[questionId] || reponses[questionId].length === 0) {
        fetchReponses(questionId);
      } else {
        setShowReplies((prev) => ({ ...prev, [questionId]: true }));
      }
    }
  };

  const handleOpenModal = (questionId: string) => {
    setCurrentQuestionId(questionId);
    setNewReponseText("");
    setModalVisible(true);
  };

  const handleAddReponse = async () => {
    if (!currentQuestionId || !newReponseText.trim()) {
      Alert.alert("Erreur", "Écris quelque chose avant d'envoyer.");
      return;
    }
    try {
      const userRes = await supabase.auth.getUser();
      const userId = userRes.data.user?.id;
      if (!userId) {
        Alert.alert("Erreur", "Vous devez être connecté pour répondre.");
        setModalVisible(false);
        return;
      }
      const insertRes = await supabase
        .from("responses")
        .insert({
          question_id: currentQuestionId,
          content: newReponseText.trim(),
          author_id: userId,
        })
        .select("id");
      if (insertRes.error) {
        Alert.alert(
          "Erreur",
          insertRes.error.message || "Impossible d'ajouter la réponse."
        );
        return;
      }
      await fetchReponses(currentQuestionId);
      setNewReponseText("");
      setModalVisible(false);
    } catch (err) {
      Alert.alert("Erreur", "Impossible d'ajouter la réponse.");
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.topBar}>
        <Text style={styles.title}>RyadForum</Text>
        <TouchableOpacity
          style={styles.profileBtn}
          onPress={() => {
            if (!user) navigation.navigate("Login");
          }}
        >
          <Text style={styles.profileLetter}>{firstLetter}</Text>
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {questions.map((q) => (
          <View key={q.id}>
            <Question questionText={q.title} questionId={q.id}>
              {q.content && <Reponse content={q.content} />}
              {loadingReponses[q.id] && (
                <ActivityIndicator size="small" style={{ marginVertical: 6 }} />
              )}
              {showReplies[q.id] &&
                (reponses[q.id]?.length ? (
                  reponses[q.id].map((r) => (
                    <Reponse key={r.id} content={r.content} />
                  ))
                ) : (
                  <Text style={styles.noRepliesText}>
                    Aucune réponse pour l'instant.
                  </Text>
                ))}
              <TouchableOpacity
                style={styles.replyBtn}
                onPress={() => handleOpenModal(q.id)}
              >
                <Text style={styles.replyBtnText}>Répondre</Text>
              </TouchableOpacity>
            </Question>
          </View>
        ))}
      </ScrollView>
      <TouchableOpacity
        style={styles.addBtn}
        onPress={async () => navigation.navigate("AddQuestion")}
      >
        <Text style={styles.addBtnText}>+</Text>
      </TouchableOpacity>
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <Text style={{ fontWeight: "700", fontSize: 16, marginBottom: 10 }}>
              Écrire une réponse
            </Text>
            <TextInput
              value={newReponseText}
              onChangeText={setNewReponseText}
              style={styles.modalInput}
              placeholder="Votre réponse..."
              multiline
            />
            <TouchableOpacity
              style={styles.modalBtn}
              onPress={handleAddReponse}
            >
              <Text style={{ color: "#fff", fontWeight: "600" }}>Envoyer</Text>
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
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 10,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
  },
  profileBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#2b6ef6",
    alignItems: "center",
    justifyContent: "center",
  },
  profileLetter: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 18,
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 120,
    backgroundColor: "#f7f9fc",
    height: "100%",
  },
  replyBtn: {
    marginTop: 8,
    padding: 8,
    backgroundColor: "#2b6ef6",
    borderRadius: 8,
    alignItems: "center",
  },
  replyBtnText: {
    color: "#fff",
    fontWeight: "600",
  },
  noRepliesText: {
    color: "#6b7280",
    marginVertical: 6,
    fontStyle: "italic",
  },
  addBtn: {
    position: "absolute",
    bottom: 30,
    right: 30,
    backgroundColor: "#2b6ef6",
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
  },
  addBtnText: { color: "#fff", fontWeight: "bold", fontSize: 30 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "90%",
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 12,
  },
  modalInput: {
    backgroundColor: "#f2f2f2",
    padding: 10,
    borderRadius: 10,
    height: 100,
    textAlignVertical: "top",
    marginBottom: 12,
  },
  modalBtn: {
    backgroundColor: "#2b6ef6",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
});
