import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import supabase from "../../lib/supabase"; // import par défaut (comme dans ton projet)
import { Question, Reponse } from "../../types";

interface QuestionModalProps {
  question: Question;
  onClose: () => void;
}

const QuestionModal: React.FC<QuestionModalProps> = ({ question, onClose }) => {
  const [reponses, setReponses] = useState<Reponse[]>([]);
  const [newReponse, setNewReponse] = useState("");
  const scrollRef = useRef<ScrollView | null>(null);

  useEffect(() => {
    fetchReponses();

    const channel = supabase
      .channel(`question-${question.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "responses",
          filter: `question_id=eq.${question.id}`,
        },
        (payload) => {
          try {
            const inserted = payload.new as any;
            const authorArr = inserted.author ?? [];
            const authorObj = authorArr.length > 0 ? authorArr[0] : undefined;
            const item: Reponse = {
              id: inserted.id,
              question_id: inserted.question_id,
              author_id: inserted.author_id,
              content: inserted.content,
              created_at: inserted.created_at,
              author: authorObj
                ? { id: authorObj.id ?? "", username: authorObj.username ?? "" }
                : undefined,
            };
            setReponses((prev) => {
              const next = [...prev, item];
              setTimeout(
                () => scrollRef.current?.scrollToEnd({ animated: true }),
                100
              );
              return next;
            });
          } catch (err) {
            console.error("Realtime payload handling error:", err);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question.id]);

  const fetchReponses = async () => {
    try {
      const res = await supabase
        .from("responses")
        .select(
          "id, content, question_id, author_id, created_at, author:profiles(id, username)"
        )
        .eq("question_id", question.id)
        .order("created_at", { ascending: true });

      if (res.error) {
        console.error("fetchReponses error:", res.error);
        return;
      }

      const rows = (res.data || []) as any[];
      const normalized: Reponse[] = rows.map((r) => {
        const authorArr = r.author ?? [];
        const authorObj = authorArr.length > 0 ? authorArr[0] : undefined;
        return {
          id: r.id,
          question_id: r.question_id,
          author_id: r.author_id,
          content: r.content,
          created_at: r.created_at,
          author: authorObj
            ? { id: authorObj.id ?? "", username: authorObj.username ?? "" }
            : undefined,
        } as Reponse;
      });

      setReponses(normalized);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 50);
    } catch (err) {
      console.error("fetchReponses exception:", err);
    }
  };

  const handleAddReponse = async () => {
    if (!newReponse.trim()) return;

    try {
      const userRes = await supabase.auth.getUser();
      const userId = userRes.data.user?.id;

      if (!userId) {
        Alert.alert("Erreur", "Vous devez être connecté pour répondre.");
        return;
      }

      const insertRes = await supabase
        .from("responses")
        .insert({
          question_id: question.id,
          content: newReponse.trim(),
          author_id: userId,
        })
        .select(
          "id, content, question_id, author_id, created_at, author:profiles(id, username)"
        );

      if (insertRes.error) {
        console.error("insert response error:", insertRes.error);
        Alert.alert("Erreur", insertRes.error.message);
        return;
      }

      const insertedRows = (insertRes.data || []) as any[];
      if (insertedRows.length > 0) {
        const r = insertedRows[0];
        const authorArr = r.author ?? [];
        const authorObj = authorArr.length > 0 ? authorArr[0] : undefined;
        const created: Reponse = {
          id: r.id,
          question_id: r.question_id,
          author_id: r.author_id,
          content: r.content,
          created_at: r.created_at,
          author: authorObj
            ? { id: authorObj.id ?? "", username: authorObj.username ?? "" }
            : undefined,
        };
        setReponses((prev) => [...prev, created]);
        setNewReponse("");
        setTimeout(
          () => scrollRef.current?.scrollToEnd({ animated: true }),
          100
        );
      }
    } catch (err) {
      console.error("handleAddReponse error:", err);
      Alert.alert("Erreur", "Impossible d'ajouter la réponse.");
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1 }}
    >
      <View style={styles.container}>
        <Text style={styles.title}>{question.title}</Text>

        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={{ paddingBottom: 10 }}
        >
          {reponses.map((r) => (
            <View key={r.id} style={styles.reponse}>
              <Text style={styles.author}>
                {r.author?.username ?? "Anonyme"}
              </Text>
              <Text>{r.content}</Text>
            </View>
          ))}
        </ScrollView>

        <TextInput
          style={styles.input}
          placeholder="Écrire une réponse..."
          value={newReponse}
          onChangeText={setNewReponse}
          multiline
        />
        <TouchableOpacity style={styles.btn} onPress={handleAddReponse}>
          <Text style={{ color: "white", textAlign: "center" }}>Répondre</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <Text style={{ color: "#007bff", textAlign: "center" }}>Fermer</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

export default QuestionModal;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 15 },
  scroll: { flex: 1, marginBottom: 10 },
  reponse: {
    marginBottom: 12,
    padding: 10,
    backgroundColor: "#f2f2f2",
    borderRadius: 10,
  },
  author: { fontWeight: "700", marginBottom: 4 },
  input: {
    backgroundColor: "#f2f2f2",
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  btn: {
    backgroundColor: "#007bff",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  closeBtn: { padding: 10, alignItems: "center", marginTop: 10 },
});
