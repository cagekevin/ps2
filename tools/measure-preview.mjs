/**
 * 量重设计稿的真实宽度：把每页的 .body 与各行 scrollWidth/clientWidth 写进 title，
 * 再用 chrome --dump-dom 读出来。避免靠截图目测。
 *
 * 用法：node tools/measure-preview.mjs && chrome --dump-dom file:///.../chk.html
 */
import { readFileSync, writeFileSync } from 'node:fs';

const pages = ['font', 'manage', 'common', 'style', 'set', 'debug'];
for (const key of pages) {
  const html = readFileSync(`docs/preview/redesign/${key}.html`, 'utf8');
  const probe = `<script>
window.addEventListener('load', () => {
  const out = [];
  const shell = document.querySelector('.shell');
  const main = document.querySelector('.main');
  const body = document.querySelector('.body');
  out.push('shell=' + shell.getBoundingClientRect().width);
  out.push('main=' + main.getBoundingClientRect().width);
  if (body) {
    out.push('bodyClient=' + body.clientWidth + ' bodyScroll=' + body.scrollWidth);
    document.querySelectorAll('.body .row, .body .row--pair, .body .tools, .body .grid-6, .body .grid-8, .body .tiles').forEach((el, i) => {
      if (el.scrollWidth > el.clientWidth + 1) out.push('OVERFLOW#' + i + ' ' + el.className + ' c=' + el.clientWidth + ' s=' + el.scrollWidth);
    });
  }
  document.title = 'MEASURE|' + out.join(' | ');
});
</script>`;
  writeFileSync(`docs/preview/redesign/chk-${key}.html`, html.replace('</body>', probe + '\n</body>'), 'utf8');
}
console.log('probe written for', pages.length, 'pages');
