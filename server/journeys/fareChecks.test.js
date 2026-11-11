// @vitest-environment node
import { expect, it } from "vitest";
import { flagFares } from "./fareChecks.js";
const legs=[1,2,3,4].map(id=>({id:String(id),mode:"train",distanceKm:100}));
const fare=value=>({basic:value,standard:value,premium:value,pricing:"perPerson"});
it.each([[2000,"unusually_high"],[1,"unusually_low"]])("flags the relative outlier %s without changing prices",(value,flag)=>{
 const fares={"1":fare(100),"2":fare(110),"3":fare(120),"4":fare(value)};
 const result=flagFares(fares,legs,"USD");
 expect(result["4"].flags).toContain(flag);
 expect(result["4"].basic).toBe(value);
 expect(fares["4"].flags).toBeUndefined();
});
it("handles a single leg, currency-specific bounds and zero distance",()=>{
 const fares={"1":fare(10000)};
 expect(flagFares(fares,[legs[0]],"INR")["1"].flags).toContain("unusually_high");
 expect(flagFares(fares,[legs[0]],"USD")["1"].flags).toEqual([]);
 expect(flagFares(fares,[{...legs[0],distanceKm:0}],"INR")["1"].flags).toEqual([]);
 expect(flagFares({"1":fare(100)},[legs[0]],"INR")["1"].flags).toEqual([]);
});
