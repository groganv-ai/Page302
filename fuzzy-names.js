/* Local, submit-only spelling assistance. Trial thresholds; disabled unless the host opts in. */
(function(root) {
    'use strict';
    const config = Object.freeze({margin: 0.12, bands: Object.freeze([
        {min: 6, max: 8, edits: 2, similarity: 0.75},
        {min: 9, max: 12, edits: 3, similarity: 0.78},
        {min: 13, max: Infinity, edits: 4, similarity: 0.80}
    ])});
    const normalize = name => String(name).normalize('NFD').replace(/\p{M}/gu, '')
        .toUpperCase().toLowerCase().replace(/[\s'\u2018\u2019\u02BC\uFF07\-\u2010-\u2015]/gu, '');
    // Unrestricted Damerau-Levenshtein, including adjacent transpositions.
    function distance(left, right) {
        const a=Array.from(left), b=Array.from(right), n=a.length, m=b.length, inf=n+m;
        const d=Array.from({length:n+2},()=>Array(m+2).fill(0)), last=new Map();
        d[0][0]=inf;
        for(let i=0;i<=n;i++){d[i+1][0]=inf;d[i+1][1]=i;}
        for(let j=0;j<=m;j++){d[0][j+1]=inf;d[1][j+1]=j;}
        for(let i=1;i<=n;i++){
            let match=0;
            for(let j=1;j<=m;j++){
                const row=last.get(b[j-1])||0, col=match, cost=a[i-1]===b[j-1]?0:1;
                if(!cost)match=j;
                d[i+1][j+1]=Math.min(d[i][j]+cost,d[i+1][j]+1,d[i][j+1]+1,
                    d[row][col]+i-row-1+1+j-col-1);
            }
            last.set(a[i-1],i);
        }
        return d[n+1][m+1];
    }
    function index(records) {
        const groups=new Map();
        for(const record of records){
            const key=normalize(record.surname);
            if(!groups.has(key))groups.set(key,{key,surname:record.surname,positions:new Set()});
            record.positions.forEach(p=>groups.get(key).positions.add(p));
        }
        return [...groups.values()];
    }
    function rank(input, candidates, position) {
        const key=normalize(input), band=config.bands.find(b=>key.length>=b.min&&key.length<=b.max);
        const none={kind:'none'};
        if(!band)return none;
        const ranked=candidates.map(c=>({...c,edits:distance(key,c.key),similarity:1-distance(key,c.key)/Math.max(key.length,c.key.length)}))
            .sort((a,b)=>b.similarity-a.similarity||a.key.localeCompare(b.key));
        const top=ranked[0];
        if(!top||top.edits<2||top.edits>band.edits||top.similarity<band.similarity)return none;
        if(top.key.startsWith(key)||key.startsWith(top.key)||top.key.length-key.length>band.edits)return none;
        // A complete component of a compound name is never fuzzy evidence for the whole name.
        const parts=top.surname.split(/[\s\-\u2010-\u2015]+/).map(normalize);
        if(parts.length>1&&parts.includes(key))return none;
        if(ranked[1]&&top.similarity-ranked[1].similarity<config.margin)return {kind:'none',ambiguous:true};
        return top.positions.has(position)?{kind:'confident_same_position',surname:top.surname}:{kind:'confident_other_position'};
    }
    const api={config,normalize,distance,index,rank};
    if(typeof module==='object'&&module.exports)module.exports=api;
    else root.Page302Fuzzy=api;
})(typeof window==='object'?window:globalThis);
