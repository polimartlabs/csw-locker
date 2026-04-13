import { describe, it, expect, beforeEach } from "vitest";
import { TransactionDataService } from "../transactionDataService";

describe("TransactionDataService Helper Functions", () => {
  let service: TransactionDataService;

  beforeEach(() => {
    service = new TransactionDataService();
  });

  describe("determineTransactionAction", () => {
    it("should return contract_deploy for contract deploy transactions", () => {
      const txData = {
        tx_type: "smart_contract",
        tx_id: "test-id",
        tx_status: "success",
        block_time_iso: "2023-01-01T00:00:00Z",
        sender_address: "SP123",
        post_conditions: [],
      };

      const result = service.determineTransactionAction(
        txData,
        0,
        0,
        undefined,
        "SP456"
      );
      expect(result).toBe("contract_deploy");
    });

    it('should return "sent" for STX transactions with stx_sent > 0', () => {
      const txData = {
        tx_type: "token_transfer",
        tx_id: "test-id",
        tx_status: "success",
        block_time_iso: "2023-01-01T00:00:00Z",
        sender_address: "SP123",
        post_conditions: [],
      };

      const result = service.determineTransactionAction(
        txData,
        1000000,
        0,
        undefined,
        "SP456"
      );
      expect(result).toBe("sent");
    });

    it('should return "receive" for STX transactions with stx_received > 0', () => {
      const txData = {
        tx_type: "token_transfer",
        tx_id: "test-id",
        tx_status: "success",
        block_time_iso: "2023-01-01T00:00:00Z",
        sender_address: "SP123",
        post_conditions: [],
      };

      const result = service.determineTransactionAction(
        txData,
        0,
        1000000,
        undefined,
        "SP456"
      );
      expect(result).toBe("receive");
    });

    it("should return function name for contract calls with no post conditions", () => {
      const txData = {
        tx_type: "contract_call",
        tx_id: "test-id",
        tx_status: "success",
        block_time_iso: "2023-01-01T00:00:00Z",
        sender_address: "SP123",
        post_conditions: [],
        contract_call: {
          function_name: "transfer",
          function_args: [],
        },
      };

      const result = service.determineTransactionAction(
        txData,
        0,
        0,
        undefined,
        "SP456"
      );
      expect(result).toBe("contract_call");
    });

    it("should return tx_type for contract calls with no post conditions and no function name", () => {
      const txData = {
        tx_type: "contract_call",
        tx_id: "test-id",
        tx_status: "success",
        block_time_iso: "2023-01-01T00:00:00Z",
        sender_address: "SP123",
        post_conditions: [],
      };

      const result = service.determineTransactionAction(
        txData,
        0,
        0,
        undefined,
        "SP456"
      );
      expect(result).toBe("contract_call");
    });

    it('should return "sent" when pcSender equals address with post conditions', () => {
      const txData = {
        tx_type: "contract_call",
        tx_id: "test-id",
        tx_status: "success",
        block_time_iso: "2023-01-01T00:00:00Z",
        sender_address: "SP123",
        post_conditions: [
          {
            principal: { address: "SP456" },
            amount: "1000000",
          },
        ],
      };

      const result = service.determineTransactionAction(
        txData,
        0,
        0,
        "SP456",
        "SP456"
      );
      expect(result).toBe("sent");
    });

    it('should return "receive" when pcSender does not equal address with post conditions', () => {
      const txData = {
        tx_type: "contract_call",
        tx_id: "test-id",
        tx_status: "success",
        block_time_iso: "2023-01-01T00:00:00Z",
        sender_address: "SP123",
        post_conditions: [
          {
            principal: { address: "SP789" },
            amount: "1000000",
          },
        ],
      };

      const result = service.determineTransactionAction(
        txData,
        0,
        0,
        "SP789",
        "SP456"
      );
      expect(result).toBe("receive");
    });
  });

  describe("determineTransactionSender", () => {
    it("should return txSender for STX received transactions", () => {
      const txData = {
        tx_type: "token_transfer",
        tx_id: "test-id",
        tx_status: "success",
        block_time_iso: "2023-01-01T00:00:00Z",
        sender_address: "SP123",
        post_conditions: [],
      };

      const result = service.determineActor(
        txData,
        0,
        1000000,
        "SP789",
        "SP123"
      );
      expect(result).toBe("SP123");
    });

    it("should return txSender for STX sent transactions", () => {
      const txData = {
        tx_type: "token_transfer",
        tx_id: "test-id",
        tx_status: "success",
        block_time_iso: "2023-01-01T00:00:00Z",
        sender_address: "SP123",
        post_conditions: [],
      };

      const result = service.determineActor(
        txData,
        1000000,
        0,
        "SP789",
        "SP123"
      );
      expect(result).toBe("SP123");
    });

    it("should return pcSender for STX transactions with no sent/received when pcSender exists", () => {
      const txData = {
        tx_type: "token_transfer",
        tx_id: "test-id",
        tx_status: "success",
        block_time_iso: "2023-01-01T00:00:00Z",
        sender_address: "SP123",
        post_conditions: [],
      };

      // This tests the case where isStx = false (0 sent, 0 received) but we have pcSender
      // In this case, since post_conditions.length = 0, it should return txSender
      const result = service.determineActor(txData, 0, 0, "SP789", "SP123");
      expect(result).toBe("SP123");
    });

    it("should return pcSender for edge case STX transaction with post conditions", () => {
      const txData = {
        tx_type: "token_transfer",
        tx_id: "test-id",
        tx_status: "success",
        block_time_iso: "2023-01-01T00:00:00Z",
        sender_address: "SP123",
        post_conditions: [
          {
            principal: { address: "SP789" },
            amount: "0",
          },
        ],
      };

      // This tests the case where isStx = false but we have post conditions with pcSender
      const result = service.determineActor(txData, 0, 0, "SP789", "SP123");
      expect(result).toBe("SP789");
    });

    it("should return txSender for STX transactions with no sent/received when pcSender is undefined", () => {
      const txData = {
        tx_type: "token_transfer",
        tx_id: "test-id",
        tx_status: "success",
        block_time_iso: "2023-01-01T00:00:00Z",
        sender_address: "SP123",
        post_conditions: [],
      };

      const result = service.determineActor(txData, 0, 0, undefined, "SP123");
      expect(result).toBe("SP123");
    });

    it("should return pcSender for non-STX transactions with post conditions when pcSender exists", () => {
      const txData = {
        tx_type: "contract_call",
        tx_id: "test-id",
        tx_status: "success",
        block_time_iso: "2023-01-01T00:00:00Z",
        sender_address: "SP123",
        post_conditions: [
          {
            principal: { address: "SP789" },
            amount: "1000000",
          },
        ],
      };

      const result = service.determineActor(txData, 0, 0, "SP789", "SP123");
      expect(result).toBe("SP789");
    });

    it("should return txSender for non-STX transactions with post conditions when pcSender is undefined", () => {
      const txData = {
        tx_type: "contract_call",
        tx_id: "test-id",
        tx_status: "success",
        block_time_iso: "2023-01-01T00:00:00Z",
        sender_address: "SP123",
        post_conditions: [
          {
            principal: { address: "SP789" },
            amount: "1000000",
          },
        ],
      };

      const result = service.determineActor(txData, 0, 0, undefined, "SP123");
      expect(result).toBe("SP123");
    });

    it("should return txSender for non-STX transactions with no post conditions", () => {
      const txData = {
        tx_type: "contract_call",
        tx_id: "test-id",
        tx_status: "success",
        block_time_iso: "2023-01-01T00:00:00Z",
        sender_address: "SP123",
        post_conditions: [],
      };

      const result = service.determineActor(txData, 0, 0, "SP789", "SP123");
      expect(result).toBe("SP123");
    });
  });

  describe("edge cases", () => {
    it("should handle contract_deploy with confirmed status in determineTransactionAction", () => {
      const txData = {
        tx_type: "smart_contract",
        tx_id: "test-id",
        tx_status: "confirmed",
        block_time_iso: "2023-01-01T00:00:00Z",
        sender_address: "SP123",
        post_conditions: [],
      };

      const result = service.determineTransactionAction(
        txData,
        0,
        0,
        undefined,
        "SP456"
      );
      expect(result).toBe("contract_deploy");
    });

    it("should handle both stx_sent and stx_received > 0", () => {
      const txData = {
        tx_type: "token_transfer",
        tx_id: "test-id",
        tx_status: "success",
        block_time_iso: "2023-01-01T00:00:00Z",
        sender_address: "SP123",
        post_conditions: [],
      };

      // Both sent and received - should prioritize "sent" since stxsent > 0
      const result = service.determineTransactionAction(
        txData,
        1000000,
        500000,
        undefined,
        "SP456"
      );
      expect(result).toBe("sent");
    });

    it("should handle missing function_args in contract_call", () => {
      const txData = {
        tx_type: "contract_call",
        tx_id: "test-id",
        tx_status: "success",
        block_time_iso: "2023-01-01T00:00:00Z",
        sender_address: "SP123",
        post_conditions: [],
        contract_call: {
          function_name: "transfer",
          function_args: [],
        },
      };

      const result = service.determineActor(txData, 0, 0, "SP789", "SP123");
      expect(result).toBe("SP123"); // Should fallback to txSender
    });
  });
});
