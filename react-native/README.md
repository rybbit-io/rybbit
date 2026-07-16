# @rybbit/react-native

React Native analytics SDK for Rybbit.

## Install

```sh
npm install @rybbit/react-native @react-native-async-storage/async-storage
```

## Usage

```ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import rybbit from "@rybbit/react-native";

await rybbit.init({
  analyticsHost: "https://app.rybbit.io/api",
  siteId: "your-site-id",
  appIdentifier: "com.example.app",
  storage: AsyncStorage,
  initialScreenName: "Home",
});

await rybbit.event("signup_started", { plan: "pro" });
await rybbit.identify("user_123", { plan: "pro" });
```

## React Navigation

```tsx
const navigationTracker = rybbit.createNavigationTracker();

<NavigationContainer
  ref={navigationRef}
  onReady={() => navigationTracker.onReady(navigationRef.current)}
  onStateChange={() => navigationTracker.onStateChange(navigationRef.current)}
>
  {/* screens */}
</NavigationContainer>;
```

The SDK uses a generated anonymous install ID stored through the provided storage adapter. Pass AsyncStorage or a compatible storage object for persistence across app launches.
