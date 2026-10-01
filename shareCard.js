/** Draw a receipt-style PNG and share it (or download if Web Share isn't available). */
export async function shareBagCheckCard({
  title, prompt, chosenLabel, left, right, chosenSide, bagDelta, name, bagScore,
}) {
  const w = 720;
  const h = 920;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#F6FAFD";
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = "#FFFFFF";
  roundRect(ctx, 48, 48, w - 96, h - 96, 8);
  ctx.fill();
  ctx.strokeStyle = "#D7E6F0";
  ctx.lineWidth = 3;
  ctx.stroke();

  const logoSize = 64;
  const logo = await loadLogo();
  if (logo) ctx.drawImage(logo, (w - logoSize) / 2, 64, logoSize, logoSize);

  ctx.fillStyle = "#4E7191";
  ctx.font = "700 22px 'Space Grotesk', system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("THE BAG CHECK", w / 2, 160);

  ctx.fillStyle = "#0A2E5D";
  ctx.font = "700 36px 'Space Grotesk', system-ui, sans-serif";
  wrapText(ctx, title, w / 2, 210, w - 160, 42);

  dashLine(ctx, 80, 280, w - 80);

  ctx.font = "600 22px 'Plus Jakarta Sans', system-ui, sans-serif";
  ctx.fillStyle = "#0A2E5D";
  wrapText(ctx, prompt, w / 2, 325, w - 160, 30);

  ctx.font = "700 24px 'Plus Jakarta Sans', system-ui, sans-serif";
  wrapText(ctx, `You chose: ${chosenLabel}`, w / 2, 420, w - 160, 32);

  drawBar(ctx, left.label, left.pct, chosenSide === "left", 80, 500, w - 160);
  drawBar(ctx, right.label, right.pct, chosenSide === "right", 80, 590, w - 160);

  const delta = bagDelta >= 0 ? `+${bagDelta}` : String(bagDelta);
  ctx.fillStyle = bagDelta >= 0 ? "#1E9E6B" : "#E2603A";
  ctx.font = "700 28px 'Space Grotesk', system-ui, sans-serif";
  ctx.fillText(`Bag Score ${delta}`, w / 2, 720);

  ctx.fillStyle = "#4E7191";
  ctx.font = "600 20px 'Plus Jakarta Sans', system-ui, sans-serif";
  ctx.fillText(`${name || "Player"} · ${Math.round(bagScore ?? 620)}`, w / 2, 770);

  ctx.fillStyle = "#6E8598";
  ctx.font = "700 16px 'Space Grotesk', system-ui, sans-serif";
  ctx.fillText("the bag  ·  a money type, a life, a ledger", w / 2, 830);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("Could not render share card");
  const file = new File([blob], "bag-check.png", { type: "image/png" });

  try {
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: "The Bag Check",
        text: `${title} — I chose: ${chosenLabel}`,
      });
      return "shared";
    }
  } catch (err) {
    if (err?.name === "AbortError") return "cancelled";
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "bag-check.png";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
  return "downloaded";
}

/** Load /logo.png for the canvas; resolves null if it can't load so the card still renders. */
function loadLogo() {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = `${import.meta.env?.BASE_URL ?? "/"}logo.png`;
  });
}

function roundRect(ctx, x, y, width, height, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function dashLine(ctx, x1, y, x2) {
  ctx.save();
  ctx.strokeStyle = "#D7E6F0";
  ctx.setLineDash([8, 8]);
  ctx.beginPath();
  ctx.moveTo(x1, y);
  ctx.lineTo(x2, y);
  ctx.stroke();
  ctx.restore();
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = String(text).split(" ");
  let line = "";
  let yy = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, yy);
      line = word;
      yy += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, yy);
}

function drawBar(ctx, label, pct, highlight, x, y, width) {
  ctx.textAlign = "left";
  ctx.font = "700 18px 'Plus Jakarta Sans', system-ui, sans-serif";
  ctx.fillStyle = highlight ? "#0A2E5D" : "#4E7191";
  const tag = highlight ? `${label}  ← you` : label;
  ctx.fillText(tag.length > 42 ? `${tag.slice(0, 40)}…` : tag, x, y);
  ctx.textAlign = "right";
  ctx.fillText(`${pct}%`, x + width, y);

  ctx.fillStyle = "#EAF2F8";
  roundRect(ctx, x, y + 10, width, 16, 8);
  ctx.fill();
  ctx.fillStyle = highlight ? "#349AFF" : "#CBD9E3";
  roundRect(ctx, x, y + 10, Math.max(8, (width * pct) / 100), 16, 8);
  ctx.fill();
  ctx.textAlign = "center";
}
