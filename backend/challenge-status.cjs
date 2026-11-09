function challengeStatus(pack,now){
 const timestamp=now.toISOString();
 return {packId:pack.id,revision:pack.revision,serverTime:timestamp,opensAt:pack.opens_at,
  closesAt:pack.closes_at||null,published:!!pack.published_at,
  status:pack.published_at||(pack.closes_at&&timestamp>=pack.closes_at)?'closed':timestamp<pack.opens_at?'upcoming':'open'};
}
function standing(rank,total,final){
 // Competition ties share the percentage of accepted results ranked ahead.
 const percent=(rank-1)/total*100;
 const band=[10,25,50,60,70,80,90].find(value=>percent<=value)||null;
 // Never expose unpublished rank or submission counts through this endpoint.
 return {topPercent:band,outsideTop90:band===null,final};
}
module.exports={challengeStatus,standing};
