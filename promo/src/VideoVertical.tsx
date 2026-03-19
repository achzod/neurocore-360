import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { Scene01_Boot_V } from "./scenes/Scene01_Boot_V";
import { Scene02_Problem_V } from "./scenes/Scene02_Problem_V";
import { Scene03_Brand_V } from "./scenes/Scene03_Brand_V";
import { Scene04_Products_V } from "./scenes/Scene04_Products_V";
import { Scene05_Proof_V } from "./scenes/Scene05_Proof_V";
import { Scene06_CTA_V } from "./scenes/Scene06_CTA_V";
import { Scene07_End_V } from "./scenes/Scene07_End_V";
import { SubtitleTrack_V } from "./components/SubtitleTrack_V";

export const ApexLabsPromoVertical: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#050505" }}>
      {/* Background music */}
      <Audio src={staticFile("ambient-track.m4a")} volume={0.7} />

      {/* Scene 01 — Boot Sequence (0-3s) */}
      <Sequence from={0} durationInFrames={90} name="Boot">
        <Scene01_Boot_V />
      </Sequence>

      {/* Scene 02 — Problem Statement (3-7s) */}
      <Sequence from={90} durationInFrames={120} name="Problem">
        <Scene02_Problem_V />
      </Sequence>

      {/* Scene 03 — Brand Reveal (7-10s) */}
      <Sequence from={210} durationInFrames={90} name="Brand">
        <Scene03_Brand_V />
      </Sequence>

      {/* Scene 04 — Product Showcase (10-28s) */}
      <Sequence from={300} durationInFrames={540} name="Products">
        <Scene04_Products_V />
      </Sequence>

      {/* Scene 05 — Social Proof (28-33s) */}
      <Sequence from={840} durationInFrames={150} name="Proof">
        <Scene05_Proof_V />
      </Sequence>

      {/* Scene 06 — CTA (33-38s) */}
      <Sequence from={990} durationInFrames={150} name="CTA">
        <Scene06_CTA_V />
      </Sequence>

      {/* Scene 07 — End Card (38-40s) */}
      <Sequence from={1140} durationInFrames={60} name="End">
        <Scene07_End_V />
      </Sequence>

      {/* Subtitle overlay — always on top */}
      <Sequence from={0} durationInFrames={1200} name="Subtitles">
        <SubtitleTrack_V />
      </Sequence>
    </AbsoluteFill>
  );
};
