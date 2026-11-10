export function formatMoney(value,currency) { return new Intl.NumberFormat(undefined,{style:"currency",currency}).format(value); }
export function computeCostBreakdown({selections={},travelers={adults:1,children:0},days=0,rooms=1,activitiesTotal=0,contingencyOn=false}) {
  const people=travelers.adults+travelers.children, nights=Math.max(days-1,0);
  const t=selections.travelOptions || {},s=selections.stayOptions || {},l=selections.localTransportOptions || {},f=selections.foodOptions || {};
  const travel=((t.farePerPersonRoundTrip || 0)+(t.originTransferPerPersonRoundTrip || 0)+(t.destinationTransferPerPersonRoundTrip || 0))*people;
  const stay=(s.pricePerRoomPerNight || 0)*nights*rooms;
  const local=(l.pricePerDay || 0)*days*(l.pricing==="perGroup"?1:people);
  const food=(f.dailyPerPerson || 0)*days*people;
  const activities=activitiesTotal*people, subtotal=travel+stay+local+food+activities;
  const contingency=contingencyOn?subtotal*0.1:0,total=subtotal+contingency;
  return {travel,stay,local,food,activities,contingency,total,perPerson:people?total/people:0,perDay:days?total/days:0};
}
export function presetSelections(options,preset="Balanced") {
  return Object.fromEntries(Object.entries(options).filter(([,v])=>Array.isArray(v)&&v[0]?.id).map(([key,list])=>{
    const value = item => key==="travelOptions"?(item.farePerPersonRoundTrip+item.originTransferPerPersonRoundTrip+item.destinationTransferPerPersonRoundTrip):key==="stayOptions"?item.pricePerRoomPerNight:key==="localTransportOptions"?item.pricePerDay:item.dailyPerPerson;
    const sorted=[...list].sort((a,b)=>value(a)-value(b));
    const item=preset==="Cheapest combo"?sorted[0]:preset==="Comfort"?sorted.at(-1):list.find(x=>x.comfort==="standard" || x.tier==="mid") || sorted[Math.floor(sorted.length/2)];
    return [key,item.id];
  }));
}
