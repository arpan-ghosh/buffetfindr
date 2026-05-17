import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen
          name="restaurant/[id]"
          options={{
            presentation: "modal",
            headerShown: true,
            headerTitle: "",
            headerTransparent: true,
            headerBackTitle: "Back",
            headerTintColor: "#f97316",
          }}
        />
        <Stack.Screen
          name="submit"
          options={{
            presentation: "modal",
            headerShown: false,
          }}
        />
      </Stack>
    </>
  );
}
