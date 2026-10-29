import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const [label, moduleFile, output] = process.argv.slice(2);
const api = await import(pathToFileURL(path.resolve(moduleFile)).href);
const results: { name: string; pass: boolean; expected: unknown; actual?: unknown; error?: string }[] = [];
const check = (name: string, expected: unknown, fn: () => unknown) => {
  try {
    const actual = fn();
    assert.deepEqual(actual, expected);
    results.push({ name, pass: true, expected, actual });
  } catch (error) {
    results.push({ name, pass: false, expected, error: String(error) });
  }
};
const documentURL = 'https://document.example/root/page.html';
const absoluteBase = 'https://cdn.example/assets/';
const loaders = {
  load: (html: string, options: object) => api.load(html, options),
  loadBuffer: (html: string, options: object) => api.loadBuffer(Buffer.from(html), options),
};
for (const [loaderName, loader] of Object.entries(loaders)) {
  for (const [attribute, tags] of Object.entries({ href: ['a', 'area', 'link'], src: ['audio', 'embed', 'iframe', 'img', 'input', 'script', 'source', 'track', 'video'] })) {
    for (const tag of tags) {
      const html = `<html><head><base href="${absoluteBase}"></head><body><${tag} id="target" ${attribute}="item.bin"></${tag}></body></html>`;
      for (const [optionLabel, options] of [['absent', {}], ['empty', { baseURI: '' }], ['present', { baseURI: documentURL }]] as const) {
        check(`${loaderName}/${tag}.${attribute}/${optionLabel}`, `${absoluteBase}item.bin`, () => loader(html, options)('#target').prop(attribute));
      }
    }
  }
  check(`${loaderName}/extract-absolute-head/no-caller`, { links: [`${absoluteBase}first`, `${absoluteBase}second`], image: `${absoluteBase}picture.png` }, () => {
    const $ = loader(`<head><base href="${absoluteBase}"></head><a href="first">a</a><a href="second">b</a><img src="picture.png">`, {});
    return $.extract({ links: [{ selector: 'a', value: 'href' }], image: { selector: 'img', value: 'src' } });
  });
  const controls = [
    ['no-head-base', '', {}, 'item'],
    ['relative-base-no-caller', '<base href="sub/">', {}, 'item'],
    ['invalid-base-no-caller', '<base href="http://[">', {}, 'item'],
    ['data-base-no-caller', '<base href="data:text/plain,x">', {}, 'item'],
    ['javascript-base-no-caller', '<base href="javascript:0">', {}, 'item'],
    ['relative-base-with-caller', '<base href="sub/">', {baseURI: documentURL}, 'https://document.example/root/sub/item'],
    ['target-only-base', `<base target="_blank"><base href="${absoluteBase}">`, {}, `${absoluteBase}item`],
    ['invalid-first-not-second', `<base href="http://["><base href="${absoluteBase}">`, {}, 'item'],
    ['relative-first-not-second', `<base href="sub/"><base href="${absoluteBase}">`, {}, 'item'],
    ['empty-first-not-second', `<base href=""><base href="${absoluteBase}">`, {baseURI:documentURL}, 'https://document.example/root/item'],
    ['data-first-not-second', `<base href="data:text/plain,x"><base href="${absoluteBase}">`, {baseURI:documentURL}, 'https://document.example/root/item'],
    ['opaque-base-relative-link', '<base href="mailto:user@example.com">', {}, 'item'],
    ['opaque-base-with-caller', '<base href="mailto:user@example.com">', {baseURI:documentURL}, 'item'],
    ['template-only', `<template><base href="${absoluteBase}"></template>`, {}, 'item'],
    ['template-before-real-base', `<template><base href="https://ignored.example/"></template><base href="${absoluteBase}">`, {}, `${absoluteBase}item`],
  ] as const;
  for (const [name, head, options, expected] of controls) {
    check(`${loaderName}/${name}`, expected, () => loader(`<head>${head}</head><a href="item">x</a>`, options)('a').prop('href'));
  }
  check(`${loaderName}/base-own-href`, 'https://document.example/root/own/', () => loader(`<head><base href="${absoluteBase}"><base id="target" href="own/"></head>`, {baseURI:documentURL})('#target').prop('href'));
  check(`${loaderName}/xml-no-caller`, 'item', () => loader(`<head><base href="${absoluteBase}"/></head><a href="item"/>`, {xml:true})('a').prop('href'));
  check(`${loaderName}/xml-with-caller`, 'https://document.example/root/item', () => loader(`<head><base href="${absoluteBase}"/></head><a href="item"/>`, {xml:true,baseURI:documentURL})('a').prop('href'));
  check(`${loaderName}/unsupported-attribute-element`, 'item', () => loader(`<head><base href="${absoluteBase}"></head><div href="item">x</div>`, {})('div').prop('href'));
  check(`${loaderName}/invalid-attribute-with-caller`, 'http://[', () => loader('<a href="http://[">x</a>', {baseURI:documentURL})('a').prop('href'));
  check(`${loaderName}/invalid-caller-contract-control`, 'item', () => loader('<a href="item">x</a>', {baseURI:'http://['})('a').prop('href'));
  check(`${loaderName}/dom-mutation`, [`${absoluteBase}item`,'https://changed.example/item','item'], () => {
    const $ = loader(`<head><base href="${absoluteBase}"></head><a href="item">x</a>`, {});
    const values = [$('a').prop('href')];
    $('base').attr('href','https://changed.example/'); values.push($('a').prop('href'));
    $('base').remove(); values.push($('a').prop('href'));
    return values;
  });
}
const knownBoundaries = ['<base href="https://body.example/">','<section><base href="https://body.example/"></section>'].map(body => ({
  html:`<head></head><body>${body}<a href="item">x</a></body>`,
  actual:api.load(`<head></head><body>${body}<a href="item">x</a></body>`,{baseURI:documentURL})('a').prop('href'),
  scope:'Body/nested base lookup is outside this scoped direct-head implementation; not asserted as complete browser parity.',
}));
const source=path.resolve(moduleFile);
const report={atUtc:new Date().toISOString(),label,node:process.version,platform:process.platform,source,sourceSHA256:createHash('sha256').update(readFileSync(source)).digest('hex'),method:'Actual exported load/loadBuffer and extract plus public DOM mutation; filesystem source paths isolated per baseline/original/candidate; no helper direct calls, network or model services.',cases:results.length,passed:results.filter(r=>r.pass).length,failed:results.filter(r=>!r.pass).length,results,knownBoundaries};
writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({label,node:process.version,cases:report.cases,passed:report.passed,failed:report.failed,source}));
if(label==='candidate'&&report.failed)process.exitCode=1;
