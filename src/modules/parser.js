
class expression {
    constructor(lhs, op, rhs) {
        this.variable = lhs;
        this.op = op;
        this.values = rhs;
    }
}

const parseExpression = (expr) => {
    const IDLE = 'IDLE';
    const NOSTATE='NONE'
    const LHS='LHS'
    const OPERATOR='OP'
    const RHS='RHS'
    
    let state = NOSTATE
    let index = 0;
    let parens = 0;
    let lhsexpr=''
    let opexpr=''
    let rhsexpr=''
    let lastToken=IDLE
    let len = expr.length;
    let stateStack=[];
    
    const pushState=()=>{
      stateStack.push(state);
    }

    const popState=()=>{
      lastToken=state;
      state = stateStack[stateStack.length-1]
      stateStack.splice(-1)
    }
    
    const changeState = (newState) =>{
      if (newState!==state) {
        switch (newState)
        {
          case LHS:
            
        }
      }
      console.log("State: "+state+" => "+newState)
      lastToken=state;
      state=newState;
    }
    
    
    while (index < len) {
        const ch = expr[index];
        console.log('Char: '+ch)
        switch (ch) {
            case '(':
                pushState();
                changeState(IDLE);
                parens++;
                if ((lastToken!= OPERATOR) && (lastToken!=NOSTATE)) {
                  console.log("Expected Operator");
                }
                //result+=ch;
                break;
            case ')':
                popState();
                parens--;
                if (lastToken !== RHS) {
                  console.log("No RHS found")
                }
                if (parens<0){
                  console.log("too many closing parens");
                }
                console.log("EXPRESSION: "+lhsexpr+" "+opexpr+" "+rhsexpr)
                lhsexpr=lhsexpr+" "+opexpr+" "+rhsexpr
                changeState(LHS);
                //result+=ch;
                break;
            case '$' :
              changeState(LHS);
              lhsexpr='';
              break;
            case ' ':
              if (state===LHS){
                changeState(OPERATOR);
                opexpr='';
              }
              else if (state===OPERATOR){
                changeState(RHS);
                rhsexpr='';
              }
              else if (state!=IDLE) {
                console.log("Unexpected whitespace in state" + state)
              }
              break;
              
            default:
              if (state===LHS){
                lhsexpr+=ch;
              }
              else if (state===OPERATOR){
                opexpr+=ch;
              }
              else if (state===RHS){
                rhsexpr+=ch;
              }
              else{
                console.log("Udexpected char "+ch+" in state "+state);
              }
        }
        index++;
    }
}
console.log('App started')
console.log(parseExpression("($fwversion IN [V19,V197]) AND ($azdrv907 EQ T9U) OR (${azdrv} EQ T9U))"))
