import { StyleSheet, Text, View } from "react-native";

interface reponsesProps {
  content: string;
}

const Reponse = ({ content }: reponsesProps) => {
  return (
    <View style={styles.container}>
      <Text> {content}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginStart: 10,
    backgroundColor: "#f0f0f0",
    padding: 5,
    borderStyle: "solid",
    borderBottomWidth: 1,
    borderColor: "#ccc",
  },
});

export default Reponse;
