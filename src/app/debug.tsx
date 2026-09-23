import Constants from "expo-constants";
import { Redirect } from "expo-router";

import { aiDiagnosticsApi } from "@/features/ai/api";
import { DebugScreen } from "@/features/diagnostics/screens/DebugScreen";
import { loadLocalDiagnostics } from "@/features/diagnostics/services/diagnosticsApplication";
import { networkStatusService } from "@/features/network/networkStatusService";
import { useSafeBack } from "@/features/routing/hooks/useSafeBack";
import { environment } from "@/lib/environment";

export default function DebugRoute() {
  const goBack = useSafeBack('/profile');
  if (environment.appEnvironment !== "development") return <Redirect href="/profile" />;

  return (
    <DebugScreen
      appVersion={Constants.expoConfig?.version ?? "unknown"}
      environmentName={environment.appEnvironment}
      loadAIDiagnostics={() => aiDiagnosticsApi.load()}
      loadDiagnostics={loadLocalDiagnostics}
      networkControls={networkStatusService}
      onBack={goBack}
    />
  );
}
