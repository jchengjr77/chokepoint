import { registerRootComponent } from 'expo';

// Must run before any @chokepoint/shared hook touches the Supabase client
// — this is what calls initSupabase() with mobile's env vars and storage
// adapter. See packages/web/src/main.tsx for the equivalent on web.
import './lib/supabase';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
