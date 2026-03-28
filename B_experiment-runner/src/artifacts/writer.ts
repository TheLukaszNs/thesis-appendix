export async function writeJson(filePath: string, value: unknown): Promise<void> {
  const content = `${JSON.stringify(value, null, 2)}\n`;
  await Bun.write(filePath, content);
}

export async function writeText(filePath: string, text: string): Promise<void> {
  await Bun.write(filePath, text);
}
