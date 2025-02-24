import { createOnigurumaEngine } from 'shiki';
import { createHighlighterCoreSync } from 'shiki/core';
import bash from 'shiki/langs/bash.mjs';
import dockerfile from 'shiki/langs/dockerfile.mjs';
import js from 'shiki/langs/javascript.mjs';
import json from 'shiki/langs/json.mjs';
import jsx from 'shiki/langs/jsx.mjs';
import md from 'shiki/langs/markdown.mjs';
import mdx from 'shiki/langs/mdx.mjs';
import php from 'shiki/langs/php.mjs';
import sql from 'shiki/langs/sql.mjs';
import toml from 'shiki/langs/toml.mjs';
import tsx from 'shiki/langs/tsx.mjs';
import ts from 'shiki/langs/typescript.mjs';
import yaml from 'shiki/langs/yaml.mjs';
import dark from 'shiki/themes/github-dark.mjs';
import light from 'shiki/themes/github-light.mjs';

const engine = await createOnigurumaEngine(import('shiki/wasm'));

const shiki = createHighlighterCoreSync({
  themes: [dark, light],
  langs: [
    js,
    jsx,
    ts,
    md,
    bash,
    tsx,
    json,
    sql,
    yaml,
    mdx,
    php,
    toml,
    dockerfile,
  ],
  engine,
});

export default function Shiki(
  props: React.PropsWithChildren<{
    code: string;
    title?: string;
    language?: string;
    highlight?: Array<number | Array<number>>;
  }>,
) {
  const { code, title, language } = props;

  const html = shiki.codeToHtml(code, {
    lang: language ?? 'text',
    theme: dark.name as string,
  });

  return (
    <div className="shiki-container my-0 border-transparent">
      {title ? <div className="shiki-title">{title}</div> : null}
      <pre
        className="shiki-code [&>*]:!bg-background !text-sm"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
