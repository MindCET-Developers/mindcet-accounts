import { Audio, Video } from "@remotion/media";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

const script = [
  { from: 0, to: 84, text: "לא תאמינו מה מצאתי היום" },
  { from: 84, to: 156, text: "קלוד קוד ורימושן עובדים יחד" },
  { from: 156, to: 246, text: "ובכמה רגעים אפשר להפוך רעיון לסרטון אמיתי" },
  { from: 246, to: 330, text: "הכול בעברית, עם כתוביות ותנועה" },
  { from: 330, to: 420, text: "וזה מרגיש כמו מוצר מוכן" },
];

const colors = {
  ink: "#141417",
  paper: "#f8f4ec",
  graphite: "#26282f",
  red: "#f15a43",
  cyan: "#28b6c8",
  green: "#a6d35f",
  yellow: "#f5c84b",
  purple: "#6b5ce7",
};

const fit = (value: number, input: [number, number], output: [number, number]) =>
  interpolate(value, input, output, {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

const Subtitle = () => {
  const frame = useCurrentFrame();
  const active = script.find((line) => frame >= line.from && frame < line.to);
  const lineFrame = active ? frame - active.from : 0;

  return (
    <div
      style={{
        position: "absolute",
        bottom: 58,
        left: 260,
        right: 260,
        direction: "rtl",
        opacity: active ? fit(lineFrame, [0, 10], [0, 1]) : 0,
        transform: `translateY(${active ? fit(lineFrame, [0, 14], [22, 0]) : 22}px)`,
        fontSize: 58,
        lineHeight: 1.2,
        fontWeight: 900,
        color: "#ffffff",
        textAlign: "center",
        textShadow: "0 3px 12px rgba(0,0,0,0.55)",
        background: "linear-gradient(90deg, rgba(20,20,23,0.78), rgba(20,20,23,0.93))",
        border: "2px solid rgba(255,255,255,0.22)",
        borderRadius: 16,
        padding: "22px 42px 26px",
        boxShadow: "0 18px 50px rgba(0,0,0,0.28)",
      }}
    >
      {active?.text}
    </div>
  );
};

const PresenterVideo = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const entrance = spring({ frame, fps, config: { damping: 20, stiffness: 80 } });
  const zoom = 1.045 + Math.sin(frame * 0.018) * 0.012;
  const tilt = Math.sin(frame * 0.012) * 0.35;
  const audioLevel = Math.abs(Math.sin(frame * 0.42)) * 0.75 + 0.25;

  return (
    <div
      style={{
        position: "absolute",
        top: 132,
        left: 94,
        width: 910,
        height: 610,
        borderRadius: 28,
        overflow: "hidden",
        background: colors.ink,
        border: "1px solid rgba(255,255,255,0.26)",
        boxShadow: "0 36px 100px rgba(0,0,0,0.42)",
        opacity: fit(entrance, [0, 1], [0, 1]),
        transform: `translateY(${fit(entrance, [0, 1], [70, 0])}px)`,
      }}
    >
      <Video
        src={staticFile("presenter/presenter-talk.mp4")}
        muted
        objectFit="cover"
        style={{
          width: "100%",
          height: "100%",
          transform: `scale(${zoom}) rotate(${tilt}deg)`,
          filter: "contrast(1.06) saturate(1.08) brightness(0.99)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.12), transparent 35%, rgba(0,0,0,0.46))",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 24,
          left: 24,
          display: "flex",
          alignItems: "center",
          gap: 12,
          color: "#fff",
          fontSize: 25,
          fontWeight: 800,
        }}
      >
        <span
          style={{
            width: 16,
            height: 16,
            borderRadius: "50%",
            background: colors.red,
            boxShadow: `0 0 ${18 + audioLevel * 18}px ${colors.red}`,
          }}
        />
        REC
      </div>
      <div
        style={{
          position: "absolute",
          right: 24,
          bottom: 24,
          direction: "rtl",
          color: "#fff",
          fontSize: 28,
          fontWeight: 900,
          background: "rgba(0,0,0,0.56)",
          borderRadius: 10,
          padding: "10px 18px 12px",
        }}
      >
        רן מגן
      </div>
      <div
        style={{
          position: "absolute",
          left: 28,
          bottom: 30,
          display: "flex",
          alignItems: "flex-end",
          gap: 6,
          height: 46,
        }}
      >
        {Array.from({ length: 18 }).map((_, index) => (
          <div
            key={index}
            style={{
              width: 8,
              height: 10 + Math.abs(Math.sin(frame * 0.18 + index)) * 34 * audioLevel,
              borderRadius: 5,
              background: index % 3 === 0 ? colors.yellow : colors.green,
            }}
          />
        ))}
      </div>
    </div>
  );
};

const ProductWindow = ({
  side,
  delay,
  title,
  accent,
  rows,
}: {
  side: "top" | "bottom";
  delay: number;
  title: string;
  accent: string;
  rows: string[];
}) => {
  const frame = useCurrentFrame();
  const local = frame - delay;
  const progress = spring({
    frame: local,
    fps: 30,
    config: { damping: 18, stiffness: 96 },
  });

  return (
    <div
      style={{
        position: "absolute",
        top: side === "top" ? 132 : 472,
        right: 94,
        width: 720,
        height: 282,
        borderRadius: 20,
        border: "1px solid rgba(255,255,255,0.22)",
        background: "rgba(255,255,255,0.9)",
        boxShadow: "0 28px 80px rgba(0,0,0,0.24)",
        overflow: "hidden",
        opacity: fit(progress, [0, 0.9], [0, 1]),
        transform: `translateX(${fit(progress, [0, 1], [88, 0])}px)`,
      }}
    >
      <div
        style={{
          height: 68,
          background: accent,
          color: "#ffffff",
          display: "flex",
          alignItems: "center",
          padding: "0 28px",
          direction: "rtl",
        }}
      >
        <div style={{ fontSize: 35, fontWeight: 950 }}>{title}</div>
        <div
          style={{
            marginRight: "auto",
            width: 14,
            height: 14,
            borderRadius: "50%",
            background: "#ffffff",
            opacity: 0.85,
            boxShadow: "24px 0 0 #ffffff, 48px 0 0 #ffffff",
          }}
        />
      </div>
      <div style={{ padding: "28px 32px 0", direction: "rtl" }}>
        {rows.map((row, index) => {
          const rowProgress = fit(local - index * 10, [0, 18], [0, 1]);
          return (
            <div
              key={row}
              style={{
                marginBottom: 18,
                opacity: rowProgress,
                transform: `translateX(${fit(rowProgress, [0, 1], [30, 0])}px)`,
                fontSize: 27,
                fontWeight: 800,
                color: colors.ink,
                display: "flex",
                alignItems: "center",
                gap: 14,
              }}
            >
              <span
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  background: index % 2 === 0 ? colors.green : colors.yellow,
                  flex: "0 0 auto",
                }}
              />
              {row}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const Background = () => {
  const frame = useCurrentFrame();
  const sweep = fit((frame % 210) / 210, [0, 1], [-360, 2200]);

  return (
    <AbsoluteFill
      style={{
        background: colors.graphite,
        overflow: "hidden",
        fontFamily: "'Segoe UI', Arial, 'Noto Sans Hebrew', sans-serif",
      }}
    >
      <Video
        src={staticFile("presenter/presenter-talk.mp4")}
        muted
        objectFit="cover"
        style={{
          position: "absolute",
          inset: -60,
          width: 2040,
          height: 1200,
          opacity: 0.22,
          filter: "blur(22px) saturate(1.18) brightness(0.72)",
          transform: `scale(${1.18 + Math.sin(frame * 0.01) * 0.02})`,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(115deg, rgba(20,20,23,0.88) 0%, rgba(38,40,47,0.58) 46%, rgba(20,20,23,0.9) 100%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 0,
          left: sweep,
          width: 170,
          height: 1200,
          background: "rgba(255,255,255,0.12)",
          transform: "rotate(18deg)",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 42,
          right: 78,
          direction: "rtl",
          color: "#fff",
          fontSize: 34,
          fontWeight: 900,
          letterSpacing: 0,
          opacity: 0.9,
        }}
      >
        סרטון Remotion בעברית
      </div>
    </AbsoluteFill>
  );
};

export const MyComposition = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const headline = spring({
    frame,
    fps,
    config: { damping: 16, stiffness: 110 },
  });

  return (
    <AbsoluteFill>
      <Audio src={staticFile("presenter/presenter-talk.mp4")} volume={1.8} />
      <Background />
      <PresenterVideo />
      <div
        style={{
          position: "absolute",
          top: 810,
          left: 94,
          width: 910,
          direction: "rtl",
          color: "#ffffff",
          opacity: fit(frame, [0, 20], [0, 1]) * fit(frame, [98, 128], [1, 0]),
          transform: `translateY(${fit(headline, [0, 1], [36, 0])}px)`,
        }}
      >
        <div
          style={{
            fontSize: 62,
            lineHeight: 1.05,
            fontWeight: 950,
          }}
        >
          לא תאמינו מה מצאתי היום
        </div>
        <div
          style={{
            marginTop: 18,
            fontSize: 30,
            lineHeight: 1.3,
            fontWeight: 700,
            color: "rgba(255,255,255,0.72)",
          }}
        >
          קלוד קוד ורימושן הופכים רעיון קצר לסרטון מוכן
        </div>
      </div>
      <ProductWindow
        side="top"
        delay={82}
        title="Claude Code"
        accent={colors.purple}
        rows={["פותח רעיון מתוך שיחה", "כותב קומפוזיציה ב-React", "בודק ומתקן תוך כדי"]}
      />
      <ProductWindow
        side="bottom"
        delay={150}
        title="Remotion"
        accent={colors.cyan}
        rows={["אנימציה לפי פריימים", "כתוביות בעברית", "רנדר ישירות ל-MP4"]}
      />
      <div
        style={{
          position: "absolute",
          right: 126,
          bottom: 248,
          direction: "rtl",
          color: "#fff",
          fontSize: 36,
          fontWeight: 900,
          opacity: fit(frame, [248, 278], [0, 1]),
          transform: `translateY(${fit(frame, [248, 278], [24, 0])}px)`,
        }}
      >
        רעיון + קוד + תנועה = סרטון מוכן
      </div>
      <Subtitle />
    </AbsoluteFill>
  );
};
