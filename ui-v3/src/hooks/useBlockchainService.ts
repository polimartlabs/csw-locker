
import { useState, useCallback } from 'react';
import { useWalletConnection } from './useWalletConnection';
import { BlockchainService, TransactionParams } from '@/services/blockchainService';
import { MockBlockchainService } from '@/services/mockBlockchainService';
import { TransactionDataService, Transaction, Recipient } from '@/services/transactionDataService';
import { MockTransactionDataService } from '@/services/mockTransactionDataService';
import { AccountBalanceService, AccountBalance } from '@/services/accountBalanceService';
import { MockAccountBalanceService } from '@/services/mockAccountBalanceService';
import { SmartWalletContractService, SmartWallet, WalletActivity } from '@/services/smartWalletContractService';
import { MockSmartWalletContractService } from '@/services/mockSmartWalletContractService';
import { useSearchParams } from 'react-router-dom';

export const useBlockchainService = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [accountBalances, setAccountBalances] = useState<AccountBalance[]>([]);
  const [smartWallets, setSmartWallets] = useState<SmartWallet[]>([]);
  const [walletActivity, setWalletActivity] = useState<WalletActivity[]>([]);
  const [searchParams] = useSearchParams();

  const { isDemoMode } = useWalletConnection();

  // Select the appropriate services based on demo mode
  const blockchainService = new BlockchainService();
  const transactionDataService = new TransactionDataService();
  const accountBalanceService = new AccountBalanceService();
  const smartWalletService = new SmartWalletContractService();

  const sendTransaction = async (params: TransactionParams) => {
    setIsLoading(true);
    try {
      const result = await blockchainService.sendTransaction(params);
      console.log(`${isDemoMode ? 'Mock' : 'Real'} transaction sent:`, result);
      return result;
    } catch (error) {
      console.error('Failed to send transaction:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const loadRecentData = useCallback(async (walletAddress: string) => {
    setIsLoading(true);
    try {
      const [recentTransactions, recentRecipients] = await Promise.all([
        transactionDataService.getRecentTransactions(walletAddress),
        transactionDataService.getRecentRecipients(walletAddress)
      ]);

      setTransactions(recentTransactions);
      setRecipients(recentRecipients);
    } catch (error) {
      console.error('Failed to load recent data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isDemoMode]);

  const loadAccountBalances = useCallback(async (walletAddress: string) => {
    setIsLoading(true);
    try {
      const balances = await accountBalanceService.getAccountBalances(walletAddress);
      setAccountBalances(balances);
    } catch (error) {
      console.error('Failed to load account balances:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isDemoMode]);

  const loadSmartWallets = useCallback(async (walletAddress: string) => {
    setIsLoading(true);
    try {
      const wallets = await smartWalletService.getSmartWallets(walletAddress, searchParams);
      setSmartWallets(wallets);
    } catch (error) {
      console.error('Failed to load smart wallets:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isDemoMode]);

  const loadWalletActivity = useCallback(async (walletAddress: string) => {
    setIsLoading(true);
    try {
      const activity = await smartWalletService.getWalletActivity(walletAddress);
      setWalletActivity(activity);
    } catch (error) {
      console.error('Failed to load wallet activity:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isDemoMode]);

  const getTransactionStatus = async (txHash: string) => {
    try {
      return await blockchainService.getTransactionStatus(txHash);
    } catch (error) {
      console.error('Failed to get transaction status:', error);
      throw error;
    }
  };

  return {
    sendTransaction,
    loadRecentData,
    loadAccountBalances,
    loadSmartWallets,
    loadWalletActivity,
    getTransactionStatus,
    transactions,
    recipients,
    accountBalances,
    smartWallets,
    walletActivity,
    isLoading,
    isDemoMode
  };
};
