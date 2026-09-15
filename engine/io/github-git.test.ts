import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { gitAuthEnvironment, redactGit } from "./github-git";

// Pure auth contract checks. The required real read-only fetch belongs to
// candidate diagnosis in Actions and must be reported separately from these tests.
const rows: Array<{name:string;result:"pass"|"fail";error?:string}> = [];
function test(name:string, check:()=>void):void {
  try { check(); rows.push({name,result:"pass"}); }
  catch (error) { rows.push({name,result:"fail",error:String(error)}); }
}
const origin = "https://github.com/HungQuach301/fulcrum-studio";
const sentinel = "fixture-auth-sentinel";
test("D-auth-exact-origin-and-dot-git",()=>{
  for(const url of [origin,origin+".git"]) {
    const env=gitAuthEnvironment(url,sentinel,{});
    assert.equal(env.GIT_CONFIG_KEY_0,"http."+url+".extraheader");
    assert.equal(env.GIT_CONFIG_VALUE_0,"AUTHORIZATION: basic "+Buffer.from("x-access-token:"+sentinel).toString("base64"));
  }
});
test("D-auth-reject-other-origin",()=>{
  for(const url of [origin+"-other",origin+"/extra",origin.replace("https:","http:"),origin.replace("github.com","example.invalid"),origin.replace("https://","https://user@")])
    assert.throws(()=>gitAuthEnvironment(url,sentinel,{}),/GitOrigin/);
});
test("D-auth-no-redirect-or-interactive-prompt",()=>{
  const env=gitAuthEnvironment(origin,sentinel,{});
  assert.equal(env.GIT_TERMINAL_PROMPT,"0");
  assert.equal(env.GIT_CONFIG_KEY_1,"http.followRedirects");assert.equal(env.GIT_CONFIG_VALUE_1,"false");
  assert.equal(env.GIT_CONFIG_KEY_2,"credential.helper");assert.equal(env.GIT_CONFIG_VALUE_2,"");
});
test("D-auth-discard-inherited-command-config-without-mutating-input",()=>{
  const inherited={PATH:"fixture-path",GIT_CONFIG_COUNT:"99",GIT_CONFIG_PARAMETERS:"fixture-override",GIT_CONFIG_KEY_42:"http.extraheader",GIT_CONFIG_VALUE_42:"fixture-leak"};
  const before={...inherited};const env=gitAuthEnvironment(origin,sentinel,inherited);
  assert.deepEqual(inherited,before);assert.equal(env.PATH,before.PATH);assert.equal(env.GIT_CONFIG_COUNT,"3");
  for(const key of ["GIT_CONFIG_PARAMETERS","GIT_CONFIG_KEY_42","GIT_CONFIG_VALUE_42"])assert.equal(env[key],undefined);
});
test("D-auth-reject-empty-and-newline-token",()=>{
  for(const token of ["","fixture\nheader","fixture\rheader"])assert.throws(()=>gitAuthEnvironment(origin,token,{}),/MissingGitToken/);
});
test("D-auth-redact-both-token-and-basic-header",()=>{
  const encoded=Buffer.from("x-access-token:"+sentinel).toString("base64");
  assert.equal(redactGit("error "+sentinel+" "+encoded,sentinel),"error [redacted] [redacted]");
  assert.equal(redactGit("ordinary message",sentinel),"ordinary message");
});
test("D-auth-Python-REST-redirect-no-follow-with-raw",()=>{
  const source=String.raw`
import importlib.util,sys,os,tempfile,pathlib,io,json,urllib.request,urllib.response
spec=importlib.util.spec_from_file_location('preflight',sys.argv[1]);module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
os.environ['GH_TOKEN']='fixture-auth-sentinel'
original=urllib.request.build_opener
for status in [301,302,303,307,308]:
 calls=[]
 class FixtureHTTPS(urllib.request.HTTPSHandler):
  def https_open(self,request):
   calls.append(request.full_url)
   assert request.full_url=='https://api.github.com/repos/HungQuach301/fulcrum-studio/git/ref/heads/main'
   response=urllib.response.addinfourl(io.BytesIO(b'redirect-body'),{'Location':'https://example.invalid/blocked'},request.full_url,status)
   response.msg='Redirect';return response
 urllib.request.build_opener=lambda *handlers:original(*handlers,FixtureHTTPS())
 with tempfile.TemporaryDirectory() as directory:
  path=pathlib.Path(directory)
  try:module.get(path,'/git/ref/heads/main','redirect')
  except ValueError as error:assert str(error)=='HTTP-no-retry:'+str(status)
  else:raise AssertionError('redirect accepted')
  assert len(calls)==1
  assert (path/'redirect-raw.json').read_bytes()==b'redirect-body'
  metadata=json.loads((path/'redirect-metadata.json').read_text());assert metadata['status']==status
  assert 'example.invalid' not in json.dumps(metadata)
urllib.request.build_opener=original
print('redirects rejected without a second request; raw retained')
`;
  const output=execFileSync("python3",["-c",source,join(process.env.GITHUB_WORKSPACE!,"scripts/wp002-preflight.py")],{encoding:"utf8"});
  assert.match(output,/redirects rejected without a second request; raw retained/);
});
const report={result:rows.every(row=>row.result==="pass")?"pass":"fail",tests:rows.length,rows,realFetch:false};
if(process.env.FS_EVIDENCE)writeFileSync(join(process.env.FS_EVIDENCE,"github-git-tests.json"),JSON.stringify(report,null,2)+"\n");
console.log(JSON.stringify(report));if(report.result!=="pass")process.exitCode=1;
