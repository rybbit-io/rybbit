import { TRPCTest } from "../../components/TRPCTest";

export default function TRPCTestPage() {
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">tRPC Integration Test</h1>
      <p className="mb-4">
        This page demonstrates the tRPC integration with the getOverview
        endpoint.
      </p>
      <TRPCTest />
    </div>
  );
}
