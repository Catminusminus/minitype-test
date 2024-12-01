# minitype-test

TypeScript で作動する日本語組版処理システムのプロトタイプです。

- TypeScript でプログラマブルに動く日本語組版処理システムの提案  
Web: https://zenn.dev/inaniwaudon/articles/5d040f543c4c69  
PDF: https://github.com/inaniwaudon/minitype-test/blob/main/test/article.pdf

## サンプルプログラムの実行方法

以下のフォント（有料フォントを含みます）を `test` 直下に配置します。

```
A-SK-GonaMin2-E.otf
AP-SK-IshiiGothicStdN-EB.otf
AP-SK-IshiiGothicStdN-M.otf
SourceHanCodeJP-Normal.otf
```

以下のスクリプトを実行します。成功すると、`test/article.pdf` が生成されます（ファイルは最初から同梱されています）。

```
cd package
yarn
yarn run build
cd ../test
yarn
npx tsx src/article.ts
```
