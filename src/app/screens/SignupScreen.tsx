import { Eye, EyeOff, Lock, User } from "lucide-react-native";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import supabase from "../../lib/supabase";

type Props = {
  navigation: any;
};

export default function SignupScreen({ navigation }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSignup = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Erreur", "Veuillez remplir tous les champs.");
      return;
    }

    try {
      setLoading(true);

      // 1️⃣ Création du compte
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password.trim(),
      });

      if (error) {
        Alert.alert("Erreur", error.message);
        return;
      }

      const user = data.user;
      if (!user) {
        Alert.alert(
          "Erreur",
          "Impossible de créer le compte. Veuillez réessayer."
        );
        return;
      }

      const username =
        user.email?.split("@")[0] || "user_" + user.id.substring(0, 8);

      const { error: insertError } = await supabase.from("profiles").insert([
        {
          id: user.id,
          username: username,
          created_at: new Date().toISOString(),
        },
      ]);

      if (insertError) {
        console.error("Erreur insertion profil :", insertError);
        Alert.alert(
          "Attention",
          "Compte créé, mais le profil n’a pas pu être enregistré."
        );
      } else {
        console.log("Profil créé avec succès !");
      }

      // 3️⃣ Confirmation à l’utilisateur
      Alert.alert(
        "Succès",
        "Compte créé avec succès ! Vous pouvez maintenant vous connecter."
      );

      navigation.replace("Login");
    } catch (err) {
      console.error("handleSignup error:", err);
      Alert.alert("Erreur", "Une erreur est survenue lors de l'inscription.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.container}
      >
        <View style={styles.card}>
          <View style={styles.logoWrap}>
            <View style={styles.logoCircle}>
              <User size={34} color="#2b6ef6" />
            </View>
            <Text style={styles.title}>Créer un compte</Text>
          </View>

          <View style={styles.form}>
            {/* Email */}
            <View style={styles.inputRow}>
              <User size={18} color="#7b8fa6" />
              <TextInput
                placeholder="Email"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
                style={styles.input}
                editable={!loading}
              />
            </View>

            {/* Password */}
            <View style={styles.inputRow}>
              <Lock size={18} color="#7b8fa6" />
              <TextInput
                placeholder="Mot de passe"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                style={[styles.input, { flex: 1 }]}
                editable={!loading}
              />
              <TouchableOpacity
                onPress={() => setShowPassword((s) => !s)}
                style={{ padding: 6 }}
                disabled={loading}
              >
                {showPassword ? (
                  <EyeOff size={18} color="#666" />
                ) : (
                  <Eye size={18} color="#666" />
                )}
              </TouchableOpacity>
            </View>

            {/* Signup button */}
            <TouchableOpacity
              style={[styles.button, loading ? styles.buttonDisabled : null]}
              onPress={handleSignup}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>S'inscrire</Text>
              )}
            </TouchableOpacity>

            {/* Back to login */}
            <View style={styles.row}>
              <Text style={styles.smallText}>Déjà inscrit ?</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate("Login")}
                disabled={loading}
              >
                <Text style={styles.linkText}> Se connecter</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f7f9fc" },
  container: { flex: 1, justifyContent: "center", paddingHorizontal: 20 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  logoWrap: { alignItems: "center", marginBottom: 18 },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#e9f0ff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  title: { fontSize: 22, fontWeight: "700", color: "#111827" },
  form: { marginTop: 6 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f3f6fb",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 12,
  },
  input: { marginLeft: 10, fontSize: 15, color: "#111827", flex: 1 },
  button: {
    backgroundColor: "#2b6ef6",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 6,
  },
  buttonDisabled: { opacity: 0.8 },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  row: { flexDirection: "row", justifyContent: "center", marginTop: 12 },
  smallText: { color: "#6b7280" },
  linkText: { color: "#2b6ef6", fontWeight: "600" },
});
