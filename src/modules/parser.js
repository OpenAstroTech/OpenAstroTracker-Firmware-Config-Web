
class expression {
  constructor(lhs, op, rhs) {
    this.lhs = lhs;
    this.op = op;
    this.rhs = rhs;
  }
}

// const ParseExpression = (props) => {
//   const { expression } = props
//   return <div>
//     {parseExpression(expression)}
//   </div>
// }

const parseExpression = (expr) => {
  const IDLE = 'IDLE';
  const NOSTATE = 'NONE'
  const LHS = 'LHS'
  const OPERATOR = 'OP'
  const RHS = 'RHS'

  let exprStack = []
  let state = NOSTATE
  let index = 0;
  let parens = 0;
  let lhsexpr = ''
  let opexpr = ''
  let rhsexpr = ''
  let lastToken = IDLE
  let len = expr.length;
  let stateStack = [];

//  console.log("ParseExpr: '" + expr + "'")
  const pushState = () => {
    stateStack.push({ state, lhsexpr, opexpr });
  }

  const popState = () => {
    lastToken = state;
    state = stateStack[stateStack.length - 1].state
    lhsexpr = stateStack[stateStack.length - 1].lhsexpr
    opexpr = stateStack[stateStack.length - 1].opexpr
    stateStack.splice(-1)
  }

  const changeState = (newState) => {
    lastToken = state;
    state = newState;
  }


  while (index < len) {
    const ch = expr[index];
    //console.log('Char: ' + ch)
    switch (ch) {
      case '(':
        pushState();
        parens++;
        if (state === RHS) {
          state = OPERATOR;
        }
        changeState(IDLE);
        if ((lastToken !== OPERATOR) && (lastToken !== NOSTATE)) {
          console.log("Expected Operator");
        }
        break;
      case ')':
        if (parens === 0) {
          console.log("too many closing parens");
        } else {
          const term = lhsexpr + " " + opexpr + " " + rhsexpr
          if (lhsexpr) {
            exprStack.push(new expression(lhsexpr, opexpr, rhsexpr))
          }
          parens--;
          if (parens === 0) {
            while (exprStack.length > 1) {
              popState();
              const newExpr = new expression(exprStack[exprStack.length - 2], opexpr, exprStack[exprStack.length - 1])
              exprStack.splice(-2);
              exprStack.push(newExpr);
            }
          }
          if (parens < 0) {
            console.log("too many closing parens");
          }
          //console.log("EXPRESSION: " + term)
          lhsexpr = ''
          changeState(LHS);
        }

        break;
      case '$':
        changeState(LHS);
        lhsexpr = '';
        break;
      case ' ':
        if (state === LHS) {
          changeState(OPERATOR);
          opexpr = '';
        }
        else if (state === OPERATOR) {
          changeState(RHS);
          rhsexpr = '';
        }
        else if (state !== IDLE) {
          console.log("Unexpected whitespace in state" + state)
        }
        break;

      default:
        if (state === LHS) {
          lhsexpr += ch;
        }
        else if (state === OPERATOR) {
          opexpr += ch;
        }
        else if (state === RHS) {
          rhsexpr += ch;
        }
        else {
          console.log("Unexpected char " + ch + " in state " + state);
        }
    }
    index++;
  }
  if (exprStack.length === 0) {
    exprStack.push(new expression(lhsexpr, opexpr, rhsexpr))
  }

//  console.log("ParseExpr: => ", exprStack[0])

  return exprStack[0]
}

//console.log('App started')
//console.log(parseExpression("($fwversion IN [V19,V197]) AND (($azdrv907 EQ T9U) OR ($azdrv EQ T9U) AND ($fwversion EQ V195))"))
//console.log(parseExpression("($fwversion == V1915) AND ($board == MEGA)"))

//export default ParseExpression 
export { expression, parseExpression }
