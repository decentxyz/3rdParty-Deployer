import { ConnectButton } from '@rainbow-me/rainbowkit';
import type { NextPage } from 'next';
import Head from 'next/head';
import styles from '../styles/Home.module.css';
import Image from 'next/image';
import Link from 'next/link';
import { R3vlProvider, createClient } from '@r3vl/sdk';
import Form from '../components/Form';
import { useRouter } from 'next/router';
import { useAccount } from 'wagmi';
import Deploy from './deploy-contracts';

const Home: NextPage = () => {
  const r3vlClient = createClient()

  return (
    <R3vlProvider client={r3vlClient}>
      <Deploy />
    </R3vlProvider>
  );
};

export default Home;
