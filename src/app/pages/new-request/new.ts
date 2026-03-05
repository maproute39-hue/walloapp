import { Component } from '@angular/core';
import { Router, RouterLink } from "@angular/router";

@Component({
  selector: 'app-new',
  imports: [RouterLink],
  templateUrl: './new.html',
  styleUrl: './new.scss'
})
export class newRequest {
     step:number=1;
    constructor(
public router:Router

    ){

    }
}
