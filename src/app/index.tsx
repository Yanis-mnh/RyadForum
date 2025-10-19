import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";
import AddQuestionScreen from "./screens/AddQuestionScreen";
import HomeScreen from "./screens/HomeScreen";
import LoginScreen from "./screens/LoginScreen";
import SignupScreen from "./screens/SignupScreen";

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <Stack.Navigator
      initialRouteName="Home"
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="AddQuestion" component={AddQuestionScreen} />
    </Stack.Navigator>
  );
}
