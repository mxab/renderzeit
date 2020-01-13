import {NowRequest, NowResponse} from '@now/node'
import * as url from 'url';
import {Renderer} from "rendertron/build/renderer";
import puppeteer, {Browser} from 'puppeteer';

import chrome from "chrome-aws-lambda";

// inspired by https://github.com/GoogleChrome/rendertron/blob/master/src/rendertron.ts#L84

async function getBrowser() {
  const execPath = await chrome.executablePath;

  return await puppeteer.launch({
    args: chrome.args,
    executablePath: execPath,
    headless: chrome.headless,
  });
}

async function render(browser: Browser, url:string, mobileVersion:boolean) {
  const renderer = new Renderer(browser);
  return await renderer.serialize(url, mobileVersion);
}

export default async (request: NowRequest, response: NowResponse) => {

  const url = request.query.url as string;
  if (!url) {
    response.status(401).send("No url given")
    return;
  }
  if (restricted(url)) {
    response.status(403).send("restricted url")
    return;
  }

  const mobileVersion = 'mobile' in request.query;

  let serialized;
  try {
    const browser = await getBrowser();
    serialized = await render(browser, url, mobileVersion);
  } catch (e) {
    response.status(500).send(e);
    return;
  }

  response.setHeader('x-renderer', 'rendertron');
  response.status(serialized.status).send(serialized.content)
}


function restricted(href: string): boolean {
  const parsedUrl = url.parse(href);
  const protocol = parsedUrl.protocol || '';

  return !protocol.match(/^https?/);

}
