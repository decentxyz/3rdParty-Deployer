import type { NextPage } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import Deploy from './deploy-contracts';
import Navbar from '../components/Navbar/Navbar';
import Head from 'next/head';

const Home: NextPage = () => {
  return <div className='bg-black'>
    <Head>
      <title>Decent</title>
      <meta
        name="description"
        content='A deployment page for launching Decent NFT contracts with Reveel revenue paths.'
      />
      <link rel="icon" href="/images/favi.png" />
    </Head>
    <Navbar />
    <Deploy />
    <footer className='py-8 border-t border-white text-white justify-center flex items-center bg-black'>
      <p className='pr-2 tracking-widest text-sm font-[400]'>Powered by </p>
      <Link href="http://decent.xyz/" className='pt-1'>
        <Image src='/images/decent.png' height={12} width={85} alt='Decent 💪' />
    </Link>
    </footer>
  </div>;
};

export default Home;
