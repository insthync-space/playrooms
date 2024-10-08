import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getAuthorisationURLWithQueryParamsAndSetState } from 'supertokens-auth-react/recipe/thirdparty';

import google from '../../../../public/assets/drawer/google.svg';
import tiktok from '../../../../public/assets/drawer/tiktok.svg';
import logo from '../../../../public/assets/logo.svg';
import { envSchema } from '../../../env';

function Index() {
  const router = useRouter();

  const authButtonClicked = async (thirdPartyId: string) => {
    const authURL = await getAuthorisationURLWithQueryParamsAndSetState({
      thirdPartyId,
      frontendRedirectURI: envSchema.NEXT_PUBLIC_FRONTEND_REDIRECT_URI,
    });
    router.push(authURL);
  };
  return (
    <div className="flex flex-col items-center mt-[71px] w-[375px]">
      <Image src={logo} alt={'company logo'} />
      <p className="text-primary mt-3.5 font-semibold">Kingo Platform</p>
      <div className="flex w-full mt-3 justify-center">
        <div className="bg-slate-200 w-3/6 h-[2px] mt-[11.25px] mr-4"></div>
        <p>Or</p>
        <div className="bg-slate-200 w-3/6 h-[2px] mt-[11.25px] ml-4"></div>
      </div>
      <div className="mt-[41.5px]">
        {/*<button className="border-solid border-2 border-gray-300 w-[380px] h-[58px] rounded-3xl">*/}
        {/*  <div className="flex gap-3 ml-[97px]">*/}
        {/*    <Image src={tiktok} alt={'company logo'} />*/}
        {/*    <p>Continue with Tiktok</p>*/}
        {/*  </div>*/}
        {/*</button>*/}
        <button
          onClick={() => authButtonClicked('google')}
          className="mt-4 border-solid border-2 border-gray-300 w-[380px] h-[58px] rounded-3xl"
        >
          <div className="flex gap-3 ml-[97px]">
            <Image src={google} alt={'company logo'} />
            <p>Continue with Google</p>
          </div>
        </button>
        <Link
          className="mt-6 bg-gradient-to-t from-secondary to-darkYellow w-[380px] h-[58px] rounded-3xl flex items-center justify-center"
          href={'/rooms'}
        >
          <p className="text-white font-semibold">Start Play</p>
        </Link>
        <div className="mt-[50px] flex justify-center gap-2 w-full">
          <p>Do you have questions?</p>
          <button>
            <p className="text-darkYellow font-semibold">
              Read the instructions
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}

export default Index;
