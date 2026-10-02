class ServiceError extends Error { constructor(status,message){super(message);this.status=status;} }
const reject=(message,status=400)=>{throw new ServiceError(status,message)};
const text=(value,max=100)=>typeof value==='string'&&value.length>0&&value.length<=max;
function normalize(input){
    if (!input || !text(input.requestId, 80) || !/^[A-Za-z0-9_-]{16,80}$/.test(input.requestId) || !/^\d{3,}$/.test(input.packId)) reject('Invalid request or pack ID');
    if (typeof input.initials !== 'string' || !/^[A-Za-z]{3}$/.test(input.initials)) reject('Enter three initials');
    if (!Number.isSafeInteger(input.score) || input.score < 0 || !Number.isSafeInteger(input.guesses) || input.guesses < 12) reject('Invalid score or guess count');
    if (!Array.isArray(input.answers) || input.answers.length !== 12) reject('A complete squad of 12 answers is required');
    const answers = input.answers.map(a => {
      if (!a || !text(a.personId, 160) || !text(a.name) || !['GK','DF','MD','AT','MAN'].includes(a.position)) reject('Invalid answer');
      if (!Array.isArray(a.clubs) || !a.clubs.length || a.clubs.length > 11 || a.clubs.some(c => !/^[A-Z]{3}$/.test(c)) || new Set(a.clubs).size !== a.clubs.length) reject('Invalid answer clubs');
      if (!Array.isArray(a.contributions) || !a.contributions.length || a.contributions.length > 11 || a.contributions.some(c => !c || !text(c.recordId,160) || !Number.isSafeInteger(c.points) || c.points < 0)) reject('Invalid contributions');
      if(a.rarity !== undefined && !['UNI','SUB','UTL','ENG','LEG'].includes(a.rarity)) reject('Invalid rarity');
      if(a.clubTier !== undefined && a.clubTier !== null && (!Number.isInteger(a.clubTier)||a.clubTier<1||a.clubTier>5)) reject('Invalid club tier');
      return { personId:a.personId, name:a.name, position:a.position, clubs:a.clubs.slice().sort(), contributions:a.contributions.map(c => ({recordId:c.recordId,points:c.points})),...(a.rarity?{rarity:a.rarity,clubTier:a.clubTier??null}:{}) };
    });
    if (new Set(answers.map(a => a.personId)).size !== 12) reject('Duplicate person');
    return {packId:input.packId, initials:input.initials.toUpperCase(), score:input.score, guesses:input.guesses, answers};
}
module.exports={normalize,ServiceError};

