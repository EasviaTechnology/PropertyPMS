(function (root) {
  'use strict';
  const clamp = (n, min, max) => Math.min(max, Math.max(min, Number.isFinite(+n) ? +n : min));
  function mortgage(principal, ratePct, years) {
    const p = Math.max(0, +principal || 0), n = Math.max(1, Math.round((+years || 30) * 12)), r = Math.max(0, +ratePct || 0) / 1200;
    const monthly = r === 0 ? p / n : p * r / (1 - Math.pow(1+r,-n));
    return { monthly, total: monthly*n, interest: monthly*n-p, principal:p, months:n };
  }
  function remaining(principal, ratePct, years, paidMonths) {
    const m = mortgage(principal, ratePct, years), r = Math.max(0,+ratePct||0)/1200, t=clamp(paidMonths,0,m.months);
    if(t >= m.months) return 0;
    if(!r) return Math.max(0, principal - m.monthly*t);
    return Math.max(0,principal*Math.pow(1+r,t) - m.monthly*(Math.pow(1+r,t)-1)/r);
  }
  // This is a rental underwriting model, NOT a lender's approval or tax computation.
  function analyze(v) {
    const price=Math.max(0,+v.price||0), units=Math.max(1,Math.round(+v.units||4)), down=clamp(v.down,0,100), rate=clamp(v.rate,0,40), years=clamp(v.years||30,1,40);
    const fha=v.loanType==='fha', baseLoan=price*(1-down/100), upfront=fha?baseLoan*0.0175:0, financedUpfront=fha&&!!v.financeUpfront;
    const loan=baseLoan+(financedUpfront?upfront:0), loanResult=mortgage(loan,rate,years);
    const tax=price*clamp(v.taxPct,0,20)/1200, insurance=Math.max(0,+v.insurance||0), hoa=Math.max(0,+v.hoa||0);
    const miPct=clamp(v.miPct,0,10), miMonthly=baseLoan*miPct/1200;
    const payment=loanResult.monthly+tax+insurance+hoa+miMonthly;
    const cashIn=price*down/100+price*clamp(v.closingPct,0,30)/100+Math.max(0,+v.repairs||0)+(financedUpfront?0:upfront);
    const rentUnit=Math.max(0,+v.rent||0), occupied=clamp(v.occupied??units,0,units), vacancy=clamp(v.vacancy,0,100)/100;
    const collected=occupied*rentUnit*(1-vacancy), reserves=collected*(clamp(v.maintenance,0,100)+clamp(v.capex,0,100)+clamp(v.management,0,100))/100;
    const extra=Math.max(0,+v.utilities||0)+Math.max(0,+v.other||0);
    const flow=collected-reserves-payment-extra, coc=cashIn>0?flow*12/cashIn*100:0;
    const factor=(1-vacancy)*(1-(clamp(v.maintenance,0,100)+clamp(v.capex,0,100)+clamp(v.management,0,100))/100);
    function rentNeeded(desiredMonthlyFlow) {return occupied*factor>0 ? (payment+extra+desiredMonthlyFlow)/(occupied*factor) : NaN;}
    const targetRoiRent=rentNeeded(cashIn*clamp(v.targetRoi,0,1000)/1200);
    const targetUnitRent=rentNeeded(Math.max(0,+v.targetCash||0)*occupied);
    return {price,units,loan,baseLoan,upfront,loanResult,tax,insurance,hoa,miMonthly,payment,cashIn, collected,reserves,extra,flow,coc,targetRoiRent,targetUnitRent,remainingYearOne:remaining(loan,rate,years,12)};
  }
  root.UnitMath={clamp,mortgage,remaining,analyze};
})(typeof window === 'undefined' ? globalThis : window);
