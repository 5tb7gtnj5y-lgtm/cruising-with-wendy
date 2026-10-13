export type SeaScene="ship"|"island"|"sunset";
const scenes:Record<SeaScene,{src:string,alt:string}>={
 ship:{src:"/sea.svg",alt:"Original illustration of a bright cruise ship sailing towards a sunny island on turquoise water"},
 island:{src:"/island.svg",alt:"Original illustration of a tropical beach, palm trees and a turquoise sea"},
 sunset:{src:"/sunset.svg",alt:"Original illustration of a cruise ship on a colourful sea at sunset"}
};
export function SeaArt({small=false,scene="ship"}:{small?:boolean,scene?:SeaScene}){
 const art=scenes[scene];
 return <img className={small?"sea-art small":"sea-art"} src={art.src} alt={art.alt} width="680" height="520" loading={small?"lazy":"eager"} fetchPriority={small?undefined:"high"}/>;
}

