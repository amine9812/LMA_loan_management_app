import type { IntegrationStatus } from "@covenantpulse/shared";

export type IntegrationAdapter = {
  id: string;
  name: string;
  getStatus: () => IntegrationStatus;
  // Placeholder: add SDK-specific sync methods here.
};

export class MockIntegration implements IntegrationAdapter {
  id = "mock";
  name = "Hackathon SDK Mock";

  getStatus(): IntegrationStatus {
    return {
      id: this.id,
      name: this.name,
      status: "Mock",
      lastSyncAt: new Date().toISOString()
    };
  }
}

export function loadIntegrations(): IntegrationAdapter[] {
  // TODO: Swap MockIntegration with real SDK adapters when available.
  return [new MockIntegration()];
}
