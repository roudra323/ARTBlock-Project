// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract Div {
    uint16 public x;
    uint16 public y;
    uint32 public div;

    event Division(string message);

    constructor() {
        x = 10;
        y = 2;
    }

    function division() public {
        div = x / y;
        emit Division("Divided");
    }
}
