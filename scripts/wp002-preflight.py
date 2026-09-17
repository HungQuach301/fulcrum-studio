"""FS24-D admission. Standard library only; inspect is local/read-only, runtime adds GET/fetch."""
import argparse, base64, hashlib, json, os, pathlib, re, subprocess, sys, urllib.request, urllib.error

sys.dont_write_bytecode = True

REPO = "HungQuach301/fulcrum-studio"
T = "78a4b28b4134fb09b4a003b90099c13460a8112d"
TREE = "ac9be3c9f327ba15cf6c0a9871d05d444a58c290"
P = "2cde1d18a989ac085a47b7ada0565b29b42577b6"
N = "bd7f0eb5b225ed43d610af12b5febbe82a7dbec4"
POLICY = {"engine/docs/02-decisions.md":"013f70ed3b536e13426755b58dc49f32a6dd275b", "engine/ops/work-packages/WP-002-interfaces.md":"677aa419aa0133e4900a80f309e0059ee89628a7", "AGENTS.md":"8ecbd886f64a8d28adbf9402e4fd3b34e8c3fd38", "engine/ops/guardrails.md":"d76b181d5a1d27ce5c0e1904118f5aa9ae38925a"}
CODE = [".github/workflows/ci.yml", ".github/workflows/acceptance-wp002.yml", ".github/workflows/commit-artifacts.yml", ".github/workflows/reindex.yml", "scripts/guardrails/index.ts", "scripts/guardrails/guardrails.test.ts", "engine/io/github-transport.ts", "engine/io/github-writer.ts", "engine/io/wp002-integration.ts", "engine/io/wp002-integration.test.ts", "scripts/wp002-preflight.py", "engine/io/github-git.ts", "engine/io/github-git.test.ts", "engine/io/repo-store.ts", "engine/io/repo-store.test.ts", "engine/io/episode-state.ts", "engine/io/run-log.ts", "engine/io/reindex.ts", "scripts/guardrails/scope.ts", "scripts/ci-report.ts"]
DATA = [f"episodes/us-personal-finance/2026-09-fs24-{s}/{f}" for s in ["left","right"] for f in ["00-brief.json","state.json"]] + ["pipeline/runs.jsonl","pipeline/state.json"]
OPS = ["initial-left","initial-right","update-one","update-two","pending","side-effect","logs-left","logs-right","reindex"]
BACKLOG = "engine/ops/backlog.md"
HISTORY = [(12,"83786225fdaff2fcbc82cd2b99212a905dd19ceb","19bb30568885ef6cb2c7c4b3c8cb9053f9b1fe21"), (13,"6d0c5abeb493699ef649f49860b370ab76c55869","c9dd48113b2a5a93dca6f92a151c8391bfb6af8d"), (14,T,"9af238d7772bba56d6b98d568fcd34d57a7d6473")]
# Owner-approved section 6; immutable policy/history are not rewritten by this exception.
RECOVERY_CHECKPOINT = "b1af7ecff4a16605918b21522027f9a6358b2f9c"
RECOVERY_ORIGIN = "b50f56c636f415be64b4b2b1f14e8093a3b67fe0"
RECOVERY_BATCH = "35037496723"
RECOVERY_APPROVAL = "b5e6faaf95ff26b2a24adfbba618595ba3e117cd0aa6b07ade92f43159beca28"
RECOVERY_REPORT = "59c0e928a9ff0ec508b0b24c3b8a7ba46356b514c560585c2c61e93556cdf6fa"
RECOVERY_FILES = ["engine/io/github-transport.ts","engine/io/wp002-integration.ts","engine/io/wp002-integration.test.ts","scripts/wp002-preflight.py","scripts/guardrails/guardrails.test.ts"]

def require(value, reason):
    if not value: raise ValueError(reason)

def redact(value):
    text = str(value); token = os.environ.get("GH_TOKEN", "")
    for secret in [token, base64.b64encode(("x-access-token:"+token).encode()).decode() if token else ""]:
        if secret: text = text.replace(secret, "[redacted]")
    return text

def git(root, *args):
    result = subprocess.run(["git","-C",str(root),*args], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    require(result.returncode == 0, "GitRead:"+redact(result.stderr.decode(errors="replace")))
    return result.stdout.decode("utf-8")

def sha(value):
    require(isinstance(value,str) and re.fullmatch(r"[a-f0-9]{40}", value), "CommitFormat")
    return value

def field(message, name):
    values = re.findall(r"^"+re.escape(name)+r": (.+)$", message, re.M)
    require(len(values)==1, "Trailer:"+name)
    return values[0]

def changed(root, before, after):
    return git(root,"diff","--no-renames","--name-only",before,after).splitlines()

def inspect(root, head):
    anchor="c4a4445e619175c015469cd33ebd427ecdd687a1"
    fanchor="2efe60ea7c74d301a1e2fc0ba52e1adc686f40dd"
    message=git(root,"show","-s","--format=%B",head)
    fdeclared=bool(re.search(r"^FS24-F-Checkpoint: "+re.escape(fanchor)+r"$",message,re.M))
    fdescendant=subprocess.run(["git","-C",str(root),"merge-base","--is-ancestor",fanchor,head],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL).returncode==0
    if head!=fanchor and (fdescendant or fdeclared):
        import importlib.util
        spec=importlib.util.spec_from_file_location("fs24f",root/"engine/io/evidence-transfer.py")
        helper=importlib.util.module_from_spec(spec);spec.loader.exec_module(helper)
        return helper.inspect_f_suffix(root,head,inspect(root,fanchor),git,field,changed,POLICY,DATA)
    if head!=anchor and subprocess.run(["git","-C",str(root),"merge-base","--is-ancestor",anchor,head],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL).returncode==0:
        import importlib.util
        spec=importlib.util.spec_from_file_location("fs24e",root/"engine/io/evidence-transfer.py")
        helper=importlib.util.module_from_spec(spec);spec.loader.exec_module(helper)
        return helper.inspect_suffix(root,head,inspect(root,anchor),git,field,changed,POLICY,DATA)
    sha(head); require(git(root,"rev-parse",T+"^{tree}").strip()==TREE, "D-base-tree")
    for index, (number, merge, candidate) in enumerate(HISTORY):
        parts=git(root,"rev-list","--parents","-n","1",merge).split()
        require(parts==[merge, N if index==0 else HISTORY[index-1][1], candidate], "D-historical-parent")
    require(git(root,"rev-list","--parents","-n","1",P).split()==[P,T],"D-policy-parent")
    require(set(changed(root,T,P))==set(POLICY),"D-policy-scope")
    for path,blob in POLICY.items():
        require(git(root,"rev-parse",P+":"+path).strip()==blob,"D-policy-pin")
        require(git(root,"show",P+":"+path).startswith(git(root,"show",T+":"+path)),"D-policy-prefix")
    git(root,"merge-base","--is-ancestor",T,head)
    cache={T:{"head":T,"code":T,"epochs":[],"data":[],"unmerged":[],"candidateBase":T,"batch":None,"origin":None,"closure":False}}
    def visit(commit):
        if commit in cache: return cache[commit]
        parts=git(root,"rev-list","--parents","-n","1",commit).split();require(len(parts) in [2,3],"D-parent-count")
        parent=parts[1];previous=visit(parent);state=json.loads(json.dumps(previous));state["head"]=commit
        message=git(root,"show","-s","--format=%B",commit);require(field(message,"Fulcrum-Grant")=="FS24-D","D-grant")
        phase=field(message,"Fulcrum-Phase");delta=changed(root,parent,commit)
        for path,blob in POLICY.items(): require(git(root,"rev-parse",commit+":"+path).strip()==blob,"D-policy-freeze")
        for path in delta:require(git(root,"ls-tree",commit,"--",path).startswith("100644 "),"D-mode")
        if commit==P:
            require(phase=="policy" and parent==T and len(parts)==2,"D-policy-identity")
        elif len(parts)==3:
            require(phase in ["integration-bootstrap","recovery","closure-merge"],"D-merge-phase")
            candidate=visit(parts[2]);require(candidate["candidateBase"]==parent and candidate["unmerged"],"D-merge-base")
            require(git(root,"rev-parse",commit+"^{tree}")==git(root,"rev-parse",parts[2]+"^{tree}"),"D-merge-tree")
            number=int(field(message,"Fulcrum-Integration-PR"));require(number>14,"D-merge-PR")
            require(candidate["data"]==previous["data"],"D-merge-data-preservation")
            for path in DATA:require(git(root,"ls-tree",parent,"--",path)==git(root,"ls-tree",commit,"--",path),"D-code-data-preservation")
            require(phase=="closure-merge" if candidate["closure"] else phase!="closure-merge","D-closure-phase")
            state=json.loads(json.dumps(candidate));state["head"]=commit;state["unmerged"]=[];state["candidateBase"]=commit
            if phase=="closure-merge":state["closure"]=True
            else:
                state["code"]=commit;state["epochs"].append({"code":commit,"base":parent,"candidate":parts[2],"pr":number})
                require(len(state["epochs"])<=3,"D-merge-cap")
        elif phase in ["implementation","closure"]:
            require(parent!=T and not previous["closure"],"D-candidate-root")
            if not previous["unmerged"]:state["candidateBase"]=T if parent==P else parent
            state["unmerged"].append(commit)
            if phase=="implementation":
                require(delta and set(delta)<=set(CODE),"D-code-scope")
                number=int(field(message,"Fulcrum-Candidate-Round"))
                after_checkpoint=any(x["commit"]==RECOVERY_CHECKPOINT for x in previous["data"])
                if number<=5:
                    require(1<=number<=5 and not after_checkpoint,"D-candidate-round")
                else:
                    require(number in [6,7] and previous.get("recoveryRounds",[])==list(range(6,number)),"D-recovery-round")
                    require(after_checkpoint and previous["batch"]==RECOVERY_BATCH and previous["origin"]==RECOVERY_ORIGIN,"D-recovery-checkpoint")
                    require(field(message,"Owner-Approval-Receipt")==RECOVERY_APPROVAL and field(message,"FS24-D-Recovery-Report")==RECOVERY_REPORT,"D-recovery-approval")
                    require(field(message,"Recovery-Checkpoint")==RECOVERY_CHECKPOINT and field(message,"FS24-D-Batch")==RECOVERY_BATCH and field(message,"Payload-Origin")==RECOVERY_ORIGIN,"D-recovery-binding")
                    require(set(delta)<=set(RECOVERY_FILES),"D-recovery-scope")
                    state["recoveryRounds"]=previous.get("recoveryRounds",[])+[number]
            else:
                require(delta==[BACKLOG] and len(previous["data"])==9,"D-closure-scope")
                require(re.fullmatch(r"[a-f0-9]{64}",field(message,"Owner-Acceptance-Receipt")),"D-owner-receipt")
                before=git(root,"show",parent+":"+BACKLOG);after=git(root,"show",commit+":"+BACKLOG)
                require(re.sub(r"(?m)^(\| WP-002 \|.*\| )todo( \|)$",r"\1done\2",before)==after and before!=after,"D-backlog-only")
                state["closure"]=True;state["closureBase"]=parent
        elif phase=="data":
            require(previous["epochs"] and not previous["unmerged"] and not previous["closure"],"D-data-code")
            batch=field(message,"FS24-D-Batch");require(re.fullmatch(r"[1-9][0-9]*",batch),"D-batch")
            operation=field(message,"Write-Id");require(operation.startswith("FS24-D:"+batch+":"),"D-write-id")
            operation=operation.split(":")[-1];require(operation in OPS and operation not in [x["operation"] for x in state["data"]],"D-duplicate-operation")
            done={x["operation"] for x in state["data"]}
            dependencies={"initial-left":[],"initial-right":[],"update-one":["initial-left","initial-right"],"update-two":["update-one"],"pending":["update-two"],"side-effect":["pending"],"logs-left":["side-effect","initial-right"],"logs-right":["side-effect","initial-right"],"reindex":[]}
            require(set(dependencies[operation])<=done,"D-data-order")
            origin=sha(field(message,"Payload-Origin"));require(origin in [x["code"] for x in state["epochs"]],"D-payload-origin")
            require(previous["batch"] in [None,batch] and previous["origin"] in [None,origin],"D-batch-origin-change")
            expected={"initial-left":DATA[:2],"initial-right":DATA[2:4],"update-one":[DATA[1]],"update-two":[DATA[1]],"pending":[DATA[1]],"side-effect":[DATA[0]],"logs-left":[DATA[4]],"logs-right":[DATA[4]],"reindex":[DATA[5]]}[operation]
            require(set(delta)==set(expected),"D-data-path")
            require(json.loads(field(message,"Write-Paths"))==sorted(expected),"D-declared-paths")
            require(re.fullmatch(r"[a-f0-9]{64}",field(message,"Input-Payload")),"D-payload-digest")
            if operation.startswith("logs-"):
                before=git(root,"show",parent+":"+DATA[4]);after=git(root,"show",commit+":"+DATA[4]);require(after.startswith(before),"D-log-prefix")
                rows=after[len(before):].splitlines();require(len(rows)==25 and len(set(rows))==25,"D-log-count")
            if operation=="reindex":
                require(len(state["data"])==8,"D-index-order")
                require(json.loads(git(root,"show",commit+":"+DATA[5]))["sourceCommit"]==parent,"D-index-source")
            state["batch"]=batch;state["origin"]=origin;state["data"].append({"commit":commit,"parent":parent,"operation":operation,"code":state["code"]})
            require(len(state["data"])<=9,"D-data-cap")
        else:raise ValueError("D-unclassified-commit")
        cache[commit]=state;return state
    state=visit(head);state["paths"]=list(POLICY)+CODE;state["dataPaths"]=DATA
    return state

def emit(directory, name, value, raw=False):
    data=value if raw else (json.dumps(value,sort_keys=True)+"\n").encode()
    (directory/name).write_bytes(data)

class NoAuthRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None

def get(directory, path, label, version="2026-03-10"):
    require(re.match(r"^/(git|actions|pulls)/",path) and ".." not in path,"GET-scope")
    request=urllib.request.Request("https://api.github.com/repos/"+REPO+path,headers={"Authorization":"Bearer "+os.environ["GH_TOKEN"],"Accept":"application/vnd.github+json","X-GitHub-Api-Version":version})
    try:response=urllib.request.build_opener(NoAuthRedirect()).open(request)
    except urllib.error.HTTPError as error:response=error
    raw=response.read(1048577);emit(directory,label+"-raw.json",raw,True)
    emit(directory,label+"-metadata.json",{"path":path,"status":response.status,"requestedApiVersion":version,"selectedApiVersion":response.headers.get("x-github-api-version-selected"),"requestId":response.headers.get("x-github-request-id"),"bytes":len(raw),"sha256":hashlib.sha256(raw).hexdigest()})
    require(len(raw)<=1048576,"ResponseCap");require(response.status==200,"HTTP-no-retry:"+str(response.status));return json.loads(raw.decode("utf-8"))

def fetch_main(root,directory):
    origin=git(root,"remote","get-url","origin").strip();require(origin in ["https://github.com/"+REPO,"https://github.com/"+REPO+".git"],"GitOrigin")
    env=os.environ.copy();token=env["GH_TOKEN"]
    require(token and not re.search(r"[\r\n]",token),"MissingGitToken")
    for key in list(env):
        if re.fullmatch(r"GIT_CONFIG_(?:COUNT|KEY_\d+|VALUE_\d+|PARAMETERS)",key): del env[key]
    header="AUTHORIZATION: basic "+base64.b64encode(("x-access-token:"+token).encode()).decode()
    env.update({"GIT_TERMINAL_PROMPT":"0","GIT_CONFIG_COUNT":"3","GIT_CONFIG_KEY_0":"http."+origin+".extraheader","GIT_CONFIG_VALUE_0":header,"GIT_CONFIG_KEY_1":"http.followRedirects","GIT_CONFIG_VALUE_1":"false","GIT_CONFIG_KEY_2":"credential.helper","GIT_CONFIG_VALUE_2":""})
    config=pathlib.Path(git(root,"rev-parse","--absolute-git-dir").strip())/"config";before=config.read_bytes()
    result=subprocess.run(["git","-C",str(root),"fetch","--no-tags","origin","main"],env=env,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
    stdout=redact(result.stdout.decode(errors="replace")).encode();stderr=redact(result.stderr.decode(errors="replace")).encode()
    emit(directory,"git-fetch.stdout.txt",stdout,True);emit(directory,"git-fetch.stderr.txt",stderr,True)
    emit(directory,"git-fetch.json",{"status":result.returncode,"origin":origin,"configUnchanged":before==config.read_bytes(),"credentialsPersisted":False,"stdoutSha256":hashlib.sha256(stdout).hexdigest(),"stderrSha256":hashlib.sha256(stderr).hexdigest()})
    require(before==config.read_bytes(),"GitConfigChanged");require(result.returncode==0,"GitFetch:"+stderr.decode());return git(root,"rev-parse","FETCH_HEAD").strip()

def runtime(root,head):
    directory=pathlib.Path(os.environ["FS_EVIDENCE"]);require(os.environ["GITHUB_REPOSITORY"]==REPO and os.environ["GITHUB_RUN_ATTEMPT"]=="1","RuntimeIdentity")
    require(git(root,"rev-parse","HEAD").strip()==head,"CheckoutHead")
    names=git(root,"ls-files","-z").split("\0")[:-1];require(not git(root,"status","--porcelain=v1","--untracked-files=all").strip(),"SourceDirty")
    emit(directory,"source.before.json",{p:hashlib.sha256((root/p).read_bytes()).hexdigest() for p in names})
    state=inspect(root,head);event=os.environ["GITHUB_EVENT_NAME"];role=os.environ["FS_JOB"]
    for path in changed(root,T,head):
        for line in git(root,"diff","--unified=0",T,head,"--",path).splitlines():
            if line.startswith("+") and not line.startswith("+++"):
                require(not re.search(r"\b(?:sk-[A-Za-z0-9_-]{16,}|gh[pousr]_[A-Za-z0-9]{20,}|AKIA[A-Z0-9]{16})\b",line),"SecretRedacted")
                require(("PRIVATE"+" KEY") not in line,"PrivateKeyRedacted")
                require(all(re.fullmatch("[a-fA-F0-9]+",x) for x in re.findall(r"[A-Za-z0-9+/]{80,}={0,2}",line)),"Base64Redacted")
    main=get(directory,"/git/ref/heads/main","main-ref.before")["object"]["sha"]
    require(fetch_main(root,directory)==main,"GitRestMainMismatch")
    if state.get("evidenceRepair"):
        require(os.environ.get("FS24_INPUT","") in ["","{}"] and os.environ.get("FS24_CONTROL","") in ["","{}"] and os.environ.get("FS_FINAL")!="true","E-no-production-activation")
        require(role not in ["writer","writer-cancel","reindex","controller","producer-left","producer-right"],"E-read-only-roles")
        with open(os.environ["GITHUB_ENV"],"a") as env:
            env.write("FS_EVIDENCE_MODE=bundle-v1\n")
    main_state=inspect(root,main);request=json.loads(os.environ.get("FS24_INPUT") or "{}");control=json.loads(os.environ.get("FS24_CONTROL") or "{}")
    candidate=bool(state["unmerged"])
    if candidate:
        require(event in ["push","pull_request"] and os.environ["FS_BRANCH"]=="wp/002" and main==state["candidateBase"],"CandidateContext")
    elif request:
        require(event=="workflow_dispatch" and os.environ["GITHUB_REF"]=="refs/heads/main" and request["grant"]=="FS24-D" and request["code"]==head,"WriterContext")
        identity=request.pop("requestId");require(hashlib.sha256(json.dumps(request,separators=(",",":"),ensure_ascii=False).encode()).hexdigest()==identity,"RequestDigest")
        require(request["cancelAfterPush"]==(role=="writer-cancel") and (request["operation"]=="reindex")== (role=="reindex"),"WriterRole")
        current=get(directory,"/actions/runs/"+os.environ["GITHUB_RUN_ID"],"current-run")
        require(current["display_title"]=="FS24-D "+identity and current["path"]==".github/workflows/"+("reindex.yml" if role=="reindex" else "commit-artifacts.yml") and current["run_attempt"]==1,"WriterRun")
        require(main_state["code"]==head and main_state["batch"] in [None,request["batch"]],"WriterMain")
    elif control:
        require(event=="workflow_dispatch" and control["grant"]=="FS24-D" and control["code"]==head and main_state["code"]==head,"ControlContext")
        identity=control.pop("requestId");require(hashlib.sha256(json.dumps(control,separators=(",",":"),ensure_ascii=False).encode()).hexdigest()==identity,"ControlDigest")
    elif os.environ.get("FS_FINAL")=="true":
        require(event=="workflow_dispatch" and main==head and len(state["data"])==9,"FinalContext")
        expected={"expected_head":head,"code":os.environ["FS_CODE"],"batch":os.environ["FS24_FINAL_BATCH"],"origin":os.environ["FS24_FINAL_ORIGIN"],"ordinal":os.environ["FS24_FINAL_ORDINAL"]}
        identity=hashlib.sha256(json.dumps(expected,separators=(",",":")).encode()).hexdigest()
        require(identity==os.environ["FS24_FINAL_REQUEST"] and expected["code"]==state["code"] and expected["batch"]==state["batch"] and expected["origin"]==state["origin"],"FinalRequestBinding")
        current=get(directory,"/actions/runs/"+os.environ["GITHUB_RUN_ID"],"final-run")
        require(current["head_sha"]==head and current["display_title"]=="FS24-D "+identity and current["event"]==event and current["head_branch"]=="main" and current["run_attempt"]==1 and current["path"]==".github/workflows/ci.yml","FinalRunBinding")
    else:
        require(event in ["push","workflow_run"] and main==head and state["epochs"],"MainContext")
    outcomes=[]
    for number,merge,expected in HISTORY+[(x["pr"],x["code"],x["candidate"]) for x in state["epochs"]]+[(x["pr"],x["head"],x["candidate"]) for x in state.get("evidenceRepair",{}).get("merges",[])]+[(x["pr"],x["head"],x["candidate"]) for x in state.get("evidenceVolume",{}).get("merges",[])]:
        try:
            pr=get(directory,"/pulls/"+str(number),"static-merge-"+str(number),"2022-11-28")
            require(pr["number"]==number and pr["merged"] is True and pr["merge_commit_sha"]==merge and pr["head"]["sha"]==expected,"ReceiptFields")
            require(pr["head"]["ref"]=="wp/002" and pr["base"]["ref"]=="main" and pr["head"]["repo"]["full_name"]==REPO==pr["base"]["repo"]["full_name"],"ReceiptRepo")
            outcomes.append({"number":number,"pass":True})
        except Exception as error:outcomes.append({"number":number,"pass":False,"error":redact(error)})
    emit(directory,"static-merge-outcomes.json",outcomes);require(all(x["pass"] for x in outcomes),"MergeReceipt")
    base=state["candidateBase"] if candidate else (os.environ.get("FS_CODE") if os.environ.get("FS_FINAL")=="true" else git(root,"rev-parse",head+"^1").strip())
    with open(os.environ["GITHUB_ENV"],"a") as output:output.write("FS_BASE="+base+"\nFS_CLOSURE="+("true" if state["closure"] else "false")+"\n")
    emit(directory,"d-lineage.json",state);emit(directory,"preflight.json",{"result":"pass","grant":"FS24-D","head":head,"main":main,"base":base,"role":role,"event":event,"eventSha":os.environ["GITHUB_SHA"],"source":N})

def preserve(root,head):
    directory=pathlib.Path(os.environ["FS_EVIDENCE"]);mirror=pathlib.Path(os.environ["TASK_ROOT"])/"mirror"
    before=json.loads((directory/"source.before.json").read_text());after={p:hashlib.sha256((root/p).read_bytes()).hexdigest() for p in before}
    emit(directory,"source.after.json",after);require(before==after,"SourceChanged")
    require(mirror.exists() and all(hashlib.sha256((mirror/p).read_bytes()).hexdigest()==value for p,value in before.items()),"MirrorChanged")
    require(git(root,"rev-parse","HEAD").strip()==head and not git(root,"status","--porcelain=v1","--untracked-files=all").strip(),"CheckoutChanged")
    main_before=json.loads((directory/"main-ref.before-raw.json").read_text())["object"]["sha"]
    main=get(directory,"/git/ref/heads/main","main-ref.after")["object"]["sha"]
    if os.environ["FS_JOB"] in ["writer","writer-cancel","reindex","controller"]:
        require(fetch_main(root,directory)==main,"PreservationGitRest")
        state=inspect(root,main);prior=inspect(root,main_before)
        require(state["code"]==head and state["data"][:len(prior["data"])]==prior["data"],"PreservationTypedData")
    else:require(main==main_before,"ReadOnlyMainChanged")
    emit(directory,"preservation.json",{"result":"pass","sourceUnchanged":True,"mirrorUnchanged":True,"mainUnchanged":main==main_before,"mainBefore":main_before,"mainAfter":main,"sourceFiles":len(before),"stateAndDependencyBytesUnchanged":True})

TEST_IDS = {'integration-tests.json': ['manifest-valid', 'manifest-extra-member', 'manifest-hash-mismatch', 'batch-initial-pair', 'batch-duplicate-path', 'batch-invalid-before-apply', 'batch-log-prefix-and-25-lines', 'batch-log-partial-rejected', 'input-valid', 'input-wrong-producer', 'input-unlisted-operation', 'R1-receipt-valid', 'R1-receipt-reject-missing', 'R1-receipt-reject-null', 'R1-receipt-reject-array', 'R1-receipt-reject-boolean', 'R1-receipt-reject-merge', 'R1-receipt-reject-head', 'R1-receipt-reject-fork', 'R1-receipt-reject-branch', 'R1-merge-identity', 'R1-reject-old-PR', 'R1-reject-wrong-base', 'R1-reject-tree', 'R1-reject-duplicate-marker', 'R1-real-candidate-policy', 'R1-reject-unmodified-base', 'R1-raw-receipt-before-parse', 'R1-malformed-raw-retained', 'R1-403-once-with-raw', 'R1-invalid-UTF8-retained', 'R1-body-cap-no-second-request', 'R1-merge-history-version-and-metadata', 'R1-merge-repair-version-and-metadata', 'R1-nonreceipt-version-preserved', 'R1-summary-diagnostic-success', 'R1-summary-diagnostic-failure', 'R1-summary-diagnostic-skipped', 'R1-summary-diagnostic-missing', 'R1-summary-failure-after-complete-frames', 'R1-independent-receipts-both-valid', 'R1-independent-receipts-history-mismatch', 'R1-independent-receipts-history-malformed', 'R1-independent-receipts-history-403', 'R1-independent-receipts-repair-mismatch', 'R1-invalid-repair-lineage-zero-GET', 'R1-invalid-receipt-scope-zero-GET', 'HTTP403-no-retry', 'api-outside-scope', 'dispatch-unlisted-workflow', 'C-manifest-and-namespace', 'C-policy-candidate', 'C-input-valid', 'C-input-reject-grant', 'C-input-reject-digest', 'C-input-reject-code', 'C-input-reject-producer', 'C-input-reject-cancel', 'C-input-reject-extra', 'C-reindex-input-valid', 'C-reindex-reject-artifact', 'C-overlap-real-interval-rule', 'C-serial-not-parallel', 'C-missing-producer', 'C-dispatch-binding', 'C-dispatch-reject-event', 'C-dispatch-reject-attempt', 'C-dispatch-reject-title', 'C-dispatch-reject-branch', 'C-dispatch-reject-repo', 'C-dispatch-reject-path', 'C-pagination-over-100', 'C-pagination-duplicate', 'C-pagination-incomplete', 'C-dispatch-200-run-id', 'C-dispatch-missing-ack-no-retry', 'C-dispatch-403-once', 'C-data-foreign-parent', 'C-data-multiple-parents', 'C-replay-manifest-collision', 'C-remote-content-mismatch', 'C-required-cleanup-step-missing', 'C-final-incomplete-json', 'D-manifest-generation-keeps-payload', 'D-control-new-request', 'D-control-extra-key', 'D-control-resume-requires-journal', 'D-frame-valid', 'D-frame-wrong-hash', 'D-frame-wrong-identity', 'D-frame-missing-tail', 'D-frame-tail-cancel-retains-complete', 'D-count-internal-skips', 'D-count-whole-workflow-skip', 'D-count-cap-with-reservation', 'D-count-attempt-rejected', 'D-resume-unstarted', 'D-resume-success-reused', 'D-resume-active-blocked', 'D-resume-committed-missing-receipt-blocked', 'D-resume-no-commit-recovery', 'D-resume-unknown-outcome-blocked', 'D-raw-receipt-gzip-hash', 'D-raw-receipt-missing-blocked', 'D-dispatch-journal-valid', 'D-dispatch-journal-no-ack-blocked', 'D-pagination-50-three-pages', 'D-pagination-raw-before-malformed', 'D-403-no-retry-raw', 'D-bind-observed-placeholder-to-title-one-post', 'D-bind-reindex-placeholder', 'D-bind-final-ci-placeholder', 'D-bind-final-validator-still-strict', 'D-bind-reject-terminal-placeholder', 'D-bind-reject-foreign-title', 'D-bind-reject-run-id', 'D-bind-reject-repository', 'D-bind-reject-head-repository', 'D-bind-reject-path', 'D-bind-reject-event', 'D-bind-reject-attempt', 'D-bind-reject-branch', 'D-bind-reject-head', 'D-bind-malformed-get-raw-before-parse', 'D-bind-get403-no-retry', 'D-bind-post403-no-get-or-repeat', 'D-group-failure-settles-sibling', 'D-group-synchronous-failure-settles-sibling', 'D-group-success-retains-order'], 'repo-store-tests.json': ['F1-identity-compatible-with-production-validator', 'pending-done-reindex-is-blocked', 'default-transport-denied', 'path-reject:/episodes/a/x/state.json', 'path-reject:episodes/a/../state.json', 'path-reject:episodes/a/2026-09-a//state.json', 'path-reject:episodes/a/2026-09-a/./state.json', 'path-reject:episodes/a/2026-09-a/secret\\file', 'path-reject:pipeline/state.json', 'path-reject:PROJECT.md', 'path-reject:episodes/a/2026-19-a/state.json', 'path-reject:episodes/a/2026-09-a/.git/config', 'path-reject:episodes/a/2026-09-a/%2e%2e/x', 'schema-and-identity-reject-before-write', 'immutable-read-and-valid-receipt', 'two-processes-common-base-distinct-episodes', 'serialized-same-episode-latest-state', 'duplicate-write-and-id-collision', 'interruption-after-model-commit-new-writer-deduplicates', 'pending-side-effect-remains-incomplete-after-state-write-fails', 'two-processes-append-exactly-fifty-lines', 'invalid-log-and-replace-rejected', 'receipt-writeid-blob-content-rejected', 'bounded-conflict-only-retry-and-increasing-backoff', 'rebase-after-conflict-preserves-independent-write', 'reindex-pure-valid-deterministic-and-negative'], 'registry-tests.json': ['configuration-resolve-without-invoke', 'duplicate-registration-rejected', 'missing-and-invalid-mapping-rejected', 'channel-mapping-read-from-repo', 'fake-interface-invocation-only'], 'guardrails-tests.json': ['WP001-1:harmless-valid-branch', 'WP001-2:outside-scope', 'WP001-3:contract-no-label', 'contract-label-no-decision', 'contract-label-with-new-decision', 'WP001-4:hex-color', 'domain-layout', 'domain-pillar', 'content-number-property', 'content-number-variable', 'F1:arbitrary-variable-180', 'F1:arbitrary-property-180', 'F1:yaml-arbitrary-key-180', 'F1:arbitrary-variable-220', 'F1:arbitrary-property-220', 'F1:yaml-arbitrary-key-220', 'F1:arbitrary-variable-3200', 'F1:arbitrary-property-3200', 'F1:yaml-arbitrary-key-3200', 'F1:arbitrary-variable-3600', 'F1:arbitrary-property-3600', 'F1:yaml-arbitrary-key-3600', 'F1:arbitrary-variable-1200', 'F1:arbitrary-property-1200', 'F1:yaml-arbitrary-key-1200', 'F1:ts-multiline-literal-only', 'F1:ts-property-literal-only', 'F1:known-key-multiline', 'F1:ts-reassignment', 'F1:ts-class-field', 'F1:ts-array', 'F1:yaml-multiline-literal-only', 'F1:yaml-array', 'F1:yaml-flow-map', 'F1:yaml-quoted-key', 'F1:yaml-quoted-before-number', 'F1:docs-excluded', 'F1:ts-comments-strings-and-sha', 'F1:ts-unrelated-numbers', 'F1:yaml-comments-strings-and-sha', 'F1:yaml-block-string', 'F1:yaml-comment-after-number', 'F1:yaml-known-key', 'WP001-5:housing-docs-not-false-positive', 'WP001-6:synthetic-secret', 'secret-values-redacted', 'base64-secret-pattern', 'private-key-pattern', 'sha-pins-not-secret', 'scope-from-main-not-candidate', 'wp-change-doc-only', 'wp-change-mixed-code-rejected', 'actual-workflow-preflight-wp-change-parity', 'cp-context', 'unknown-branch', 'conflicting-title', 'missing-wp', 'main-push-scope-only-exemption', 'rename-checks-both-paths', 'delete-in-scope', 'single-backlog-done', 'backlog-extra-change-denied', 'ambiguous-cp', 'unsafe-path-parser', 'scope-parser-missing-section', 'scope-boundary', 'wrong-baseline', 'bootstrap-freeze-and-decision', 'content-scan-exclusions', 'B-policy-freeze-scope-and-trailer', 'report-verdict-success', 'report-verdict-failure', 'report-verdict-skipped', 'report-verdict-cancelled', 'report-missing-output', 'report-wrong-sha', 'report-bounded-errors', 'frame-roundtrip', 'frame-missing-complete', 'frame-wrong-hash', 'frame-missing-chunk', 'frame-duplicate-chunk', 'frame-identity-head', 'frame-identity-attempt', 'frame-identity-job', 'frame-identity-event', 'frame-identity-base', 'frame-unsafe-name', 'C-production-scanner-valid', 'C-policy-reject-base-only', 'C-policy-reject-tree', 'C-policy-reject-freeze', 'C-policy-reject-scope', 'C-production-scanner-reject-branch', 'temporary-fixture-cleanup', 'D-current-lineage', 'E-current-lineage-preserves-D', 'E-scanner-resolves-original-WP-after-companion', 'E-original-activation-empty-tree-scan', 'D-policy-reject-mutated-blob', 'D-code-reject-outside-path', 'D-merge-parent-and-data-lineage', 'D-data-duplicate-operation', 'D-data-reject-index-before-eight', 'D-recovery-six-and-seven-preserve-data', 'D-recovery-reject-eight', 'D-recovery-reject-round-reset', 'D-recovery-reject-round-repeat', 'D-recovery-reject-skipped-six', 'D-recovery-reject-missing-approval', 'D-recovery-reject-wrong-approval', 'D-recovery-reject-wrong-binding', 'D-recovery-reject-before-checkpoint', 'D-recovery-reject-extra-scope', 'D-recovery-reject-policy-change', 'D-recovery-reject-data-change'], 'github-git-tests.json': ['D-auth-exact-origin-and-dot-git', 'D-auth-reject-other-origin', 'D-auth-no-redirect-or-interactive-prompt', 'D-auth-discard-inherited-command-config-without-mutating-input', 'D-auth-reject-empty-and-newline-token', 'D-auth-redact-both-token-and-basic-header', 'D-auth-Python-REST-redirect-no-follow-with-raw']}

TEST_IDS["integration-tests.json"] += ["E-file-observations-preserve-repeated-name","E-production-control-blocked","E-controller-blocked","E-readonly-mode"]
TEST_IDS["guardrails-tests.json"] += ["E-reference-identity","E-reference-wrong-head","E-reference-overflow"]
TEST_IDS["guardrails-tests.json"] += ["F-current-lineage-preserves-exhausted-E","F-scanner-resolves-canonical-WP-at-final-E"]

def verify_tests(suite):
    directory=pathlib.Path(os.environ["FS_EVIDENCE"])
    names=["guardrails-tests.json"] if suite=="guardrails" else ["repo-store-tests.json","registry-tests.json","integration-tests.json","github-git-tests.json"]
    outcomes=[]
    for name in names:
        report=json.loads((directory/name).read_text());rows=report.get("rows",report.get("cases",[]));actual=[x["name"] for x in rows]
        require(len(set(actual))==len(actual) and all(x["result"]=="pass" for x in rows),"TestFailureOrDuplicate:"+name)
        require(all(x in actual for x in TEST_IDS[name]),"MissingTestId:"+name)
        require("incomplete" not in report and report.get("result","pass")=="pass" and report.get("failed",0)==0,"IncompleteTestSuite:"+name)
        outcomes.append({"suite":name,"expected":TEST_IDS[name],"actual":actual,"result":"pass"})
    emit(directory,"test-manifest-"+suite+".json",outcomes)

if __name__=="__main__":
    parser=argparse.ArgumentParser();parser.add_argument("mode",choices=["inspect","runtime","preserve","tests"]);parser.add_argument("--root",default=os.environ.get("GITHUB_WORKSPACE","."));parser.add_argument("--head",default=os.environ.get("FS_HEAD"));parser.add_argument("--suite",choices=["foundation","guardrails"],default="foundation");args=parser.parse_args()
    try:
        if args.mode=="inspect":print(json.dumps(inspect(pathlib.Path(args.root),args.head),sort_keys=True))
        elif args.mode=="runtime":runtime(pathlib.Path(args.root),args.head)
        elif args.mode=="preserve":preserve(pathlib.Path(args.root),args.head)
        else:verify_tests(args.suite)
    except Exception as error:
        print(redact(error),file=sys.stderr);sys.exit(1)
