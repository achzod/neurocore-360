import { Composition } from "remotion";
import { ApexLabsPromo } from "./Video";
import { ApexLabsPromoVertical } from "./VideoVertical";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="ApexLabsPromo"
        component={ApexLabsPromo}
        durationInFrames={1200}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{}}
      />
      <Composition
        id="ApexLabsPromoVertical"
        component={ApexLabsPromoVertical}
        durationInFrames={1200}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{}}
      />
    </>
  );
};
