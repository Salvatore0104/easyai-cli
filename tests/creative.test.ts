import { describe, expect, it, afterEach } from 'vitest';
import { mkdtemp, readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { setupProject } from '../src/setup.js';
import { autoRoute } from '../src/routing.js';
import { estimate, PriceBook, validatePrices } from '../src/pricing.js';
import { pointsUsage, usageResult } from '../src/usage.js';
import { routeModel } from '../src/models.js';
const dirs: string[]=[];
afterEach(async()=>{for(const dir of dirs.splice(0)) await rm(dir,{recursive:true,force:true});});
const image={image_generate:{output_resolutions:['1K','2K','4K']},image_edit:{output_resolutions:['1K','2K','4K'],input_max_images_count:14}};
const video={omni_video:{supported_modes:['text_to_video','video_edit'],output_resolutions:['480p','720p','1080p'],duration_range:[4,30],aspect_ratio_allowed:['16:9'],output_audio:true,max_videos:3}};
const catalog={data:[{id:'Nano Banana 2',capabilities:image},{id:'Nano Banana Pro',capabilities:image},{id:'gpt-image-2.5',capabilities:image},{id:'mj-v8.2',capabilities:image},...['豆包Seedance-2.0','豆包Seedance-2.0-mini','豆包Seedance-2.0-fast','豆包Seedance-2.5'].map(id=>({id,capabilities:video}))]};
describe('creative routing and accounting',()=>{
 it('asks for intent without submitting and honors explicit settings',()=>{
  expect(autoRoute(catalog,{kind:'video'}).needsInput).toBe(true);
  expect(autoRoute(catalog,{kind:'video',model:'Seedance 2.5',payload:{resolution:'1080p',duration:12}})).toMatchObject({model:'豆包Seedance-2.5',payload:{resolution:'1080p',duration:12}});
 });
 it('chooses purpose-specific models and high image resolution',()=>{
  expect(autoRoute(catalog,{kind:'image',purpose:'风格',stage:'preview'})).toMatchObject({model:'mj-v8.2',payload:{resolution:'4K'}});
  expect(autoRoute(catalog,{kind:'image',purpose:'文字排版',stage:'final'})).toMatchObject({model:'gpt-image-2.5',payload:{resolution:'4K'}});
  expect(autoRoute(catalog,{kind:'image',purpose:'产品',stage:'refine'})).toMatchObject({model:'Nano Banana Pro'});
 });
 it('uses sourced comparable preview prices',()=>{
  const book:PriceBook={schemaVersion:'wowidea.prices/v1',source:'website export',updatedAt:new Date().toISOString(),rules:[{model:'豆包Seedance-2.0-mini',operation:'video',unit:'second',points:3},{model:'豆包Seedance-2.0-fast',operation:'video',unit:'second',points:1}]};
  expect(autoRoute(catalog,{kind:'video',purpose:'产品',stage:'preview'},book)).toMatchObject({model:'豆包Seedance-2.0-fast',payload:{resolution:'480p'},pricing:{estimatedPoints:5}});
  expect(estimate(book,'missing','image',{}).estimatedPoints).toBeNull();
  expect(estimate(book,'豆包Seedance-2.0-fast','video',{duration:-1}).estimatedPoints).toBeNull();
  expect(()=>validatePrices({...book,rules:[{...book.rules[0],points:-1}]})).toThrow();
 });
 it('supports new explicitly named live models',()=>{expect(routeModel({data:[{id:'new-image',modelType:['image_generate']}]},'image','new-image').model).toBe('new-image');});
 it('distinguishes unavailable billing, pending, zero and failed balance',async()=>{
  expect(pointsUsage({status:'succeeded'})).toMatchObject({actualPoints:null,settlementStatus:'unavailable'});
  expect(pointsUsage({billing:{status:'pending'}}).settlementStatus).toBe('pending');
  expect(pointsUsage({billing:{actualPoints:0}}).actualPoints).toBe(0);
  const api:any={request:async()=>({data:{total:12.5,balanceDetail:{reservedAmount:0,availableForNewTask:12.5}}})};
  expect(await usageResult(api,{status:'succeeded'})).toMatchObject({pointsUsage:{total:12.5,actualPoints:null}});
  api.request=async()=>{throw Error('offline')};expect(await usageResult(api,{status:'succeeded'})).toMatchObject({status:'succeeded',pointsUsage:{balanceStatus:'unavailable'}});
 });
 it('reads the platform billings array for charges and refunds',()=>{
  expect(pointsUsage({task:{billings:[{billing_calculations:{image:{amount:1}},billing_discounts:{image:{discountedAmount:1,originalAmount:1}}}]}}))
    .toMatchObject({actualPoints:1,refundedPoints:null,settlementStatus:'provided'});
  expect(pointsUsage({billings:[{billing_calculations:{image:{amount:2},video:{amount:5}}}]}).actualPoints).toBe(7);
  expect(pointsUsage({billings:[{billing_calculations:{image:{amount:-3}}}]})).toMatchObject({actualPoints:null,refundedPoints:3});
  expect(pointsUsage({billings:[{billing_type:'external-api'}]})).toMatchObject({actualPoints:null,settlementStatus:'pending'});
  expect(pointsUsage({billings:[]})).toMatchObject({actualPoints:null,settlementStatus:'unavailable'});
 });
 it('installs locally, honors override and preserves customizations across updates',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'wowidea-setup-'));dirs.push(dir);
  await writeFile(join(dir,'AGENTS.override.md'),'Existing instructions\n');
  const a=await setupProject(dir,false,resolve('.'));
  expect(a.instructions).toBe(join(dir,'AGENTS.override.md'));
  const skill=join(dir,'.agents/skills/wowidea/SKILL.md');await writeFile(skill,'My custom skill');
  await setupProject(dir,false,resolve('.'));const b=await setupProject(dir,true,resolve('.'));
  expect(await readFile(skill,'utf8')).toBe('My custom skill');expect(b.preserved).toContain('.agents/skills/wowidea/SKILL.md');
  const instructions=await readFile(a.instructions,'utf8');expect(instructions.match(/wowidea:begin/g)).toHaveLength(1);expect(instructions).toContain('Existing instructions');
 });
});
