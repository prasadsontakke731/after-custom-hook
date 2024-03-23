import { useState, useEffect } from 'react';
import { Contract } from 'ethers';
import { parseEther } from 'ethers/lib/utils';
import { useWallet } from './useWallet';
import { useChainSelector } from './useChainSelector';
import { useAppSupplies } from './useAppSupplies';
import { ChainScanner } from './ChainScanner';
import { CoinGeckoApi } from './CoinGeckoApi';

export const useBurnPage = () => {
    const {
        walletAddress,
        isWalletConnected,
        walletChain,
        openConnectModal,
    } = useWallet();
    const { openChainSelector, setOpenChainSelector } =
        useChainSelector();
    const {
        supplies,
        setSuppliesChain,
        suppliesChain,
        fetchSupplies,
    } = useAppSupplies(true);
    const [burnTransactions, setBurnTransactions] = useState < any[] > ([]);
    const [burnAmount, setBurnAmount] = useState("");
    const [txButton, setTxButton] = useState < BurnTxProgress > (
        BurnTxProgress.default
    );
    const [txProgress, setTxProgress] = useState < boolean > (false);
    const [burnTxHash, setBurnTxHash] = useState < string | null > (null);

    const executeBurn = async () => {
        if (!isWalletConnected) {
            openConnectModal();
        }
        if (burnAmount === "") {
            console.log("Enter amount to migrate");
            // Show toast or error message
            return;
        }
        const newTokenAddress = fetchAddressForChain(walletChain?.id, "newToken");
        const oftTokenContract = new Contract(
            newTokenAddress,
            oftAbi,
            ethersSigner
        );
        let amount = parseEther(burnAmount);
        setTxButton(BurnTxProgress.burning);
        setTxProgress(true);
        try {
            const burnTx = await oftTokenContract.burn(
                //tokenAddress,
                amount
            );
            setBurnTxHash(burnTx.hash);
            console.log(burnTx, burnTx.hash);
            await burnTx.wait();
            setTxButton(BurnTxProgress.default);
            setTxProgress(false);
            refetchTransactions();
            fetchSupplies();
        } catch (err) {
            console.log(err);
            setTxButton(BurnTxProgress.default);
            setTxProgress(false);
            // Show toast or error message
            return;
        }
    };

    useEffect(() => {
        if (!walletChain) return;
        let isSubscribed = true;
        if (isSubscribed) setBurnTransactions([]);
        const isTestnet = isChainTestnet(walletChain?.id);
        let _chainObjects: any[] = [mainnet, avalanche, fantom];
        if (isTestnet) _chainObjects = [sepolia, avalancheFuji, fantomTestnet];
        Promise.all(ChainScanner.fetchAllTxPromises(isTestnet))
            .then((results: any) => {
                if (isSubscribed) {
                    let new_chain_results: any[] = [];
                    results.forEach((results_a: any[], index: number) => {
                        new_chain_results.push(
                            results_a.map((tx: any) => ({
                                ...tx,
                                chain: _chainObjects[index],
                            }))
                        );
                    });
                    let res = new_chain_results.flat();
                    console.log(res, isTestnet);
                    res = ChainScanner.sortOnlyBurnTransactions(res);
                    res = res.sort((a: any, b: any) => b.timeStamp - a.timeStamp);
                    setBurnTransactions(res);
                }
            })
            .catch((err) => {
                console.log(err);
            });
        return () => {
            isSubscribed = false;
        };
    }, [walletChain]);

    return {
        walletAddress,
        isWalletConnected,
        walletChain,
        openConnectModal,
        supplies,
        suppliesChain,
        burnTransactions,
        burnAmount,
        setBurnAmount,
        txButton,
        txProgress,
        burnTxHash,
        executeBurn,
    };
};