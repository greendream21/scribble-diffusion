import Canvas from "components/canvas";
import PromptForm from "components/prompt-form";
import Head from "next/head";
import { useState } from "react";
import Predictions from "components/predictions";
import Footer from "components/footer";
import uploadFile from "lib/upload";
import Script from 'next/script'
import { PulseLoader } from "react-spinners";


const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export const appName = "Scribble Diffusion";
export const appSubtitle = "Turn your rough sketch into a refined image using Stable Diffusion";
export const appMetaDescription = appSubtitle


export default function Home() {
  const [error, setError] = useState(null);
  const [submissionCount, setSubmissionCount] = useState(0);
  const [predictions, setPredictions] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [seed] = useState({prompt: "a photo of a red helium balloon"});
  const [initialPrompt, setInitialPrompt] = useState(seed.prompt);
  const [scribble, setScribble] = useState(null);

  // // set the initial image from a random seed
  // useEffect(() => {
  //   setEvents([{ image: seed.image }]);
  // }, [seed.image]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // track submissions so we can show a spinner while waiting for the prediction to be created
    setSubmissionCount(submissionCount + 1)

    const prompt = e.target.prompt.value;

    setError(null);
    setIsProcessing(true);
    // setInitialPrompt("");

    console.log({scribble})

    const fileUrl = await uploadFile(scribble);

    const body = {
      prompt,
      image: fileUrl,
    };

    console.log({body})

    const response = await fetch("/api/predictions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const prediction = await response.json();

    console.log("prediction created", prediction)
    setPredictions(predictions => ({ ...predictions, [prediction.id]: prediction }));
    console.log({predictions})

    if (response.status !== 201) {
      setError(prediction.detail);
      return;
    }

    while (
      prediction.status !== "succeeded" &&
      prediction.status !== "failed"
    ) {
      await sleep(500);
      const response = await fetch("/api/predictions/" + prediction.id);
      const updatedPrediction = await response.json();
      console.log("prediction updated", updatedPrediction)
      setPredictions(predictions => ({ ...predictions, [updatedPrediction.id]: updatedPrediction }));
      if (response.status !== 200) {
        setError(updatedPrediction.detail);
        return;
      }
    }

    console.log("prediction completed!")    
    console.log({predictions})
    setIsProcessing(false);
  };

  const startOver = async (e) => {
    e.preventDefault();
    setError(null);
    setScribble(null)
    setIsProcessing(false);
    setInitialPrompt(seed.prompt);
  };


  return (
    <div>
      <Head>
        <title>{appName}</title>
        <meta name="description" content={appMetaDescription} />
        <meta property="og:title" content={appName} />
        <meta property="og:description" content={appMetaDescription} />
        <meta property="og:image" content="https://scribblediffusion.com/opengraph.jpg" />
        
      </Head>

      <main className="container max-w-[700px] mx-auto p-5">
        <hgroup>
          <h1 className="text-center text-5xl font-bold m-6">{appName}</h1>
          <p className="text-center text-xl opacity-60 m-6">
            {appSubtitle}
          </p>
        </hgroup>

        <Canvas onScribble={setScribble} />

        <PromptForm
          initialPrompt={initialPrompt}
          onSubmit={handleSubmit}
          isProcessing={isProcessing}
        />

        
        {submissionCount > 0 && submissionCount > Object.keys(predictions).length && (
          <div className="my-10 mx-auto w-full text-center">
            <PulseLoader />
          </div>
        )}

        <div className="mx-auto w-full">
          {error && <p className="bold text-red-500 pb-5">{error}</p>}
        </div>

        <Predictions predictions={predictions} isProcessing={isProcessing} />

        {/* <Footer
          startOver={startOver}
        /> */}
      </main>
      
      <Script src="https://js.upload.io/upload-js-full/v1" />
    </div>
  );
}
