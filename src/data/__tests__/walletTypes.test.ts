import { describe, it, expect, vi, beforeEach } from "vitest";
import { getVerifiedContracts, CONTRACT_TYPES } from "../walletTypes";
import { handleCCS } from "@/services/smartWalletContractService";

// Mock the smartWalletContractService
vi.mock("@/services/smartWalletContractService", () => ({
  handleCCS: vi.fn(),
}));

const mockHandleCCS = vi.mocked(handleCCS);

describe("getVerifiedContracts", () => {
  const testWalletId = "SP123456789ABCDEF.test-wallet";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return contracts with deployment status when all contracts are deployed", async () => {
    // Mock all contracts as deployed
    mockHandleCCS.mockResolvedValue({ found: true });

    const result = await getVerifiedContracts(testWalletId);

    expect(result).toHaveLength(CONTRACT_TYPES.length);
    expect(result.every((contract) => contract.isDeployed === true)).toBe(true);

    // Verify handleCCS was called for each contract
    expect(mockHandleCCS).toHaveBeenCalledTimes(CONTRACT_TYPES.length);
    expect(mockHandleCCS).toHaveBeenCalledWith(
      testWalletId,
      `${testWalletId}.smart-wallet`,
      false
    );
    expect(mockHandleCCS).toHaveBeenCalledWith(
      testWalletId,
      `${testWalletId}.ext-delegate-stx-pox-4`,
      false
    );
  });

  it("should return contracts with deployment status when no contracts are deployed", async () => {
    // Mock all contracts as not deployed
    mockHandleCCS.mockResolvedValue({ found: false });

    const result = await getVerifiedContracts(testWalletId);

    expect(result).toHaveLength(CONTRACT_TYPES.length);
    expect(result.every((contract) => contract.isDeployed === false)).toBe(
      true
    );
    expect(mockHandleCCS).toHaveBeenCalledTimes(CONTRACT_TYPES.length);
  });

  it("should handle mixed deployment statuses", async () => {
    // Mock smart-wallet as deployed, delegate-stx as not deployed
    mockHandleCCS
      .mockResolvedValueOnce({ found: true }) // smart-wallet
      .mockResolvedValueOnce({ found: false }); // ext-delegate-stx-pox-4

    const result = await getVerifiedContracts(testWalletId);

    expect(result).toHaveLength(2);

    const smartWallet = result.find((c) => c.name === "smart-wallet");
    const delegateStx = result.find((c) => c.name === "ext-delegate-stx-pox-4");

    expect(smartWallet?.isDeployed).toBe(true);
    expect(delegateStx?.isDeployed).toBe(false);
  });

  it("should sort contracts with deployed ones first", async () => {
    // Mock second contract as deployed, first as not deployed
    mockHandleCCS
      .mockResolvedValueOnce({ found: false }) // smart-wallet (not deployed)
      .mockResolvedValueOnce({ found: true }); // ext-delegate-stx-pox-4 (deployed)

    const result = await getVerifiedContracts(testWalletId);

    // First contract should be the deployed one
    expect(result[0].isDeployed).toBe(true);
    expect(result[0].name).toBe("ext-delegate-stx-pox-4");

    // Second contract should be the non-deployed one
    expect(result[1].isDeployed).toBe(false);
    expect(result[1].name).toBe("smart-wallet");
  });

  it("should handle contracts marked as coming soon", async () => {
    // Create a modified contract list with a coming soon contract
    const originalContractTypes = [...CONTRACT_TYPES];
    CONTRACT_TYPES.push({
      icon: "🔮",
      name: "future-contract",
      src: "/future-contract.clar",
      label: "Future Contract",
      description: "A contract coming soon",
      extensions: [],
      ext: false,
      recomended: false,
      comingSoon: true,
      isDeployed: false,
    });

    // Mock responses
    mockHandleCCS
      .mockResolvedValueOnce({ found: true }) // smart-wallet (deployed)
      .mockResolvedValueOnce({ found: false }) // ext-delegate-stx-pox-4 (not deployed)
      .mockResolvedValueOnce({ found: false }); // future-contract (coming soon)

    const result = await getVerifiedContracts(testWalletId);

    // Coming soon contracts should be sorted last
    const comingSoonContract = result.find((c) => c.comingSoon);
    expect(result[result.length - 1]).toBe(comingSoonContract);

    // Cleanup
    CONTRACT_TYPES.length = originalContractTypes.length;
  });

  it("should preserve original contract properties", async () => {
    mockHandleCCS.mockResolvedValue({ found: true });

    const result = await getVerifiedContracts(testWalletId);

    const smartWallet = result.find((c) => c.name === "smart-wallet");
    expect(smartWallet).toMatchObject({
      icon: "👥",
      name: "smart-wallet",
      src: "/smart-wallet.clar",
      label: "Personal Wallet",
      description: expect.stringContaining("Personal Wallet"),
      extensions: ["Delegate STX"],
      ext: false,
      recomended: true,
      comingSoon: false,
      isDeployed: true, // This should be updated
    });
  });

  it("should handle handleCCS errors gracefully", async () => {
    // Mock first call to succeed, second to fail
    mockHandleCCS
      .mockResolvedValueOnce({ found: true })
      .mockRejectedValueOnce(new Error("Network error"));

    const result = await getVerifiedContracts(testWalletId);

    // Should still return results for successful calls
    expect(result).toHaveLength(2);
    expect(result[0].isDeployed).toBe(true);
    expect(result[1].isDeployed).toBe(undefined); // Failed call should result in undefined
  });

  it("should handle null/undefined responses from handleCCS", async () => {
    mockHandleCCS.mockResolvedValueOnce(null).mockResolvedValueOnce(undefined);

    const result = await getVerifiedContracts(testWalletId);

    expect(result).toHaveLength(2);
    expect(result.every((contract) => contract.isDeployed === undefined)).toBe(
      true
    );
  });

  it("should call handleCCS with correct parameters for each contract", async () => {
    mockHandleCCS.mockResolvedValue({ found: true });

    await getVerifiedContracts(testWalletId);

    CONTRACT_TYPES.forEach((contract, index) => {
      expect(mockHandleCCS).toHaveBeenNthCalledWith(
        index + 1,
        testWalletId,
        `${testWalletId}.${contract.name}`,
        false
      );
    });
  });
});
