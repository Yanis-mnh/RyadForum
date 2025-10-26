import { Picker } from "@react-native-picker/picker";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import supabase from "../../lib/supabase";
import { Theme } from "../../types";

interface Props {
  navigation: any;
}

export default function AddQuestionScreen({ navigation }: Props) {
  const [title, setTitle] = useState<string>("");
  const [content, setContent] = useState<string>("");
  const [themes, setThemes] = useState<Theme[]>([]);
  const [selectedTheme, setSelectedTheme] = useState<string>("");
  const [loadingThemes, setLoadingThemes] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    fetchThemes();
  }, []);

  const fetchThemes = async () => {
    try {
      setLoadingThemes(true);
      const res = await supabase
        .from("themes")
        .select("id, name")
        .order("name", { ascending: true });

      if (res.error) throw res.error;

      const rows = (res.data || []) as Theme[];
      setThemes(rows);
      if (rows.length > 0) setSelectedTheme(rows[0].id);
    } catch (err) {
      console.error(err);
      Alert.alert("Erreur", "Impossible de charger les thèmes.");
    } finally {
      setLoadingThemes(false);
    }
  };

  const handleAddQuestion = async () => {
    if (!title.trim() || !content.trim() || !selectedTheme) {
      Alert.alert("Erreur", "Veuillez remplir tous les champs");
      return;
    }

    try {
      setSubmitting(true);

      const userRes = await supabase.auth.getUser();
      const userId = userRes.data.user?.id;

      if (!userId) {
        Alert.alert(
          "Erreur",
          "Vous devez être connecté pour publier une question."
        );
        navigation.navigate("Login");
        return;
      }

      const insertRes = await supabase
        .from("questions")
        .insert({
          title: title.trim(),
          content: content.trim(),
          theme_id: selectedTheme,
          author_id: userId,
        })
        .select();

      if (insertRes.error) throw insertRes.error;

      Alert.alert("Succès", "Question ajoutée !");
      navigation.goBack();
    } catch (err: any) {
      console.error("handleAddQuestion error:", err);
      Alert.alert(
        "Erreur",
        err.message || "Une erreur est survenue lors de la publication."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Nouvelle Question</Text>

      <TextInput
        placeholder="Titre"
        value={title}
        onChangeText={setTitle}
        style={styles.input}
      />

      {loadingThemes ? (
        <ActivityIndicator size="small" style={{ marginVertical: 12 }} />
      ) : (
        <View style={styles.pickerWrapper}>
          <Picker
            selectedValue={selectedTheme}
            onValueChange={(val) => setSelectedTheme(String(val))}
            style={styles.picker}
            dropdownIconColor="#333"
          >
            {themes.map((t) => (
              <Picker.Item key={t.id} label={t.name} value={t.id} />
            ))}
          </Picker>
        </View>
      )}

      <TouchableOpacity
        style={[styles.btn, submitting ? { opacity: 0.7 } : {}]}
        onPress={handleAddQuestion}
        disabled={submitting}
      >
        <Text style={styles.btnText}>
          {submitting ? "Publication..." : "Publier"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f7f9fc",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 16,
    textAlign: "center",
    color: "#1f2937",
  },
  input: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    textAlignVertical: "top",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  pickerWrapper: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  picker: { height: 50, width: "100%" },
  btn: {
    backgroundColor: "#2b6ef6",
    padding: 16,
    borderRadius: 12,
    marginTop: 6,
    alignItems: "center",
  },
  btnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
});
