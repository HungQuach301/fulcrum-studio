import assert from "node:assert/strict";
import { gitAuthEnvironment, redactGit } from "./github-git";

// Pure auth contract checks. No network calls or runtime fixtures are needed.
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
const report={result:rows.every(row=>row.result==="pass")?"pass":"fail",tests:rows.length,rows,realFetch:false};
console.log(JSON.stringify(report));if(report.result!=="pass")process.exitCode=1;
