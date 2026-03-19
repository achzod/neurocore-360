import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { Scene01_Boot } from "./scenes/Scene01_Boot";
import { Scene02_Problem } from "./scenes/Scene02_Problem";
import { Scene03_Brand } from "./scenes/Scene03_Brand";
import { Scene04_Products } from "./scenes/Scene04_Products";
import { Scene05_Proof } from "./scenes/Scene05_Proof";
import { Scene06_CTA } from "./scenes/Scene06_CTA";
import { Scene07_End } from "./scenes/Scene07_End";
import { SubtitleTrack } from "./components/SubtitleTrack";

export const ApexLabsPromo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#050505" }}>
      {/* Background music */}
      <Audio src={staticFile("ambient-track.m4a")} volume={0.7} />

      {/* Scene 01 — Boot Sequence (0-3s) */}
      <Sequence from={0} durationInFrames={90} name="Boot">
        <Scene01_Boot />
      </Sequence>

      {/* Scene 02 — Problem Statement (3-7s) */}
      <Sequence from={90} durationInFrames={120} name="Problem">
        <Scene02_Problem />
      </Sequence>

      {/* Scene 03 — Brand Reveal (7-10s) */}
      <Sequence from={210} durationInFrames={90} name="Brand">
        <Scene03_Brand />
      </Sequence>

      {/* Scene 04 — Product Showcase (10-28s) */}
      <Sequence from={300} durationInFrames={540} name="Products">
        <Scene04_Products />
      </Sequence>

      {/* Scene 05 — Social Proof (28-33s) */}
      <Sequence from={840} durationInFrames={150} name="Proof">
        <Scene05_Proof />
      </Sequence>

      {/* Scene 06 — CTA (33-38s) */}
      <Sequence from={990} durationInFrames={150} name="CTA">
        <Scene06_CTA />
      </Sequence>

      {/* Scene 07 — End Card (38-40s) */}
      <Sequence from={1140} durationInFrames={60} name="End">
        <Scene07_End />
      </Sequence>

      {/* Subtitle overlay — always on top */}
      <Sequence from={0} durationInFrames={1200} name="Subtitles">
        <SubtitleTrack />
      </Sequence>
    </AbsoluteFill>
  );
};
