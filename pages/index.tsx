import { ConnectButton } from '@rainbow-me/rainbowkit';
import type { NextPage } from 'next';
import Head from 'next/head';
import styles from '../styles/Home.module.css';
import Image from 'next/image';
import Link from 'next/link';
import { R3vlProvider, createClient } from '@r3vl/sdk';
import Form from '../components/Form';
import { useRouter } from 'next/router';

const Home: NextPage = () => {
  const router = useRouter()
  const r3vlClient = createClient()

  return (
    <R3vlProvider client={r3vlClient}>
    <div className={`${styles.container} bg-white`}>
      <Head>
        <title>Start off Decent</title>
        <meta
          name="description"
          content='A template for implementing the Decent Protocol wtih Rainbowkit in Next JS'
        />
        <link rel="icon" href="/images/favi.png" />
      </Head>

      <main className={styles.main}>
        <div className="flex items-center gap-4 mb-20">
        <ConnectButton />
          <Link href='https://github.com/decentxyz/Start-Decent' target='_blank'>
            <Image src='/images/github-mark-white.svg' height={22} width={22} alt='link to repository' />
          </Link>
        </div>

        <Form revPathAddress={router.query.revPath}  />
      </main>

      <footer className='py-8 border-t border-white'>
        <div />
      </footer>
    </div>
    </R3vlProvider>
  );
};

export default Home;
