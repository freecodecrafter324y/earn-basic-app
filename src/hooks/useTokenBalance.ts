// Optimized useTokenBalance Hook (Maintaining the original custom hook structure)

import { useEffect, useState, useMemo } from "react";
import { Address, Holding, Token } from "@morpho-org/blue-sdk";
import { useWalletClient } from "wagmi";

// Define the structure of the returned token data.
interface TokenBalance {
  balance: bigint;
  symbol: string;
  decimals: number;
  address: Address;
}

/**
 * Custom React hook to fetch and periodically update a user's token balance.
 *
 * @param tokenAddress The address of the ERC-20 token to monitor.
 * @returns An object containing the token balance data, loading state, and error message.
 */
export function useTokenBalance(tokenAddress: Address) {
  // Use null initially to clearly differentiate between "loading" and "no data/error".
  const [tokenBalance, setTokenBalance] = useState<TokenBalance | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch the wallet client from wagmi, which includes the connected user's address.
  const { data: client } = useWalletClient();

  // Memoize the connected user's address for stable dependency checks.
  const userAddress = useMemo(() => client?.account?.address, [client]);
  
  // Define the refresh interval in milliseconds (10 seconds as per original code).
  const refreshInterval = 10000;

  useEffect(() => {
    // Exit early if the wallet is not connected or if the token address is missing.
    if (!userAddress) {
      setIsLoading(false);
      setTokenBalance(null);
      return;
    }

    // Ensure client is available for SDK calls
    if (!client) return; 

    const fetchBalance = async () => {
      // Set loading state only at the start of the fetching process
      setIsLoading(true);

      try {
        // Use Promise.all to fetch the holding (balance) and token metadata concurrently.
        const [holding, token] = await Promise.all([
          Holding.fetch(userAddress, tokenAddress, client),
          Token.fetch(tokenAddress, client),
        ]);

        // Construct the result object. Symbol fallback is necessary if the SDK returns null/undefined.
        setTokenBalance({
          balance: holding.balance,
          symbol: token.symbol ?? "",
          decimals: token.decimals,
          address: tokenAddress,
        });
        setError(null);

      } catch (err) {
        // Log the detailed error for debugging purposes.
        console.error("Error fetching token balance:", err);
        
        setError(
          err instanceof Error 
            ? `Failed to fetch balance: ${err.message}` 
            : "An unknown error occurred while fetching the token balance."
        );
        setTokenBalance(null); // Clear previous balance on error.
      } finally {
        // Ensure loading state is turned off regardless of success or failure.
        setIsLoading(false);
      }
    };

    // Initial fetch and start the periodic refresh.
    fetchBalance();
    const intervalId = setInterval(fetchBalance, refreshInterval);

    // Cleanup function to stop the interval when the component unmounts or dependencies change.
    return () => clearInterval(intervalId);
    
  }, [client, userAddress, tokenAddress]); // Dependencies: client (for viem), userAddress (memoized), tokenAddress.

  return { tokenBalance, isLoading, error };
}
