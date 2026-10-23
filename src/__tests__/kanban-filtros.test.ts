import {describe,expect,it} from 'vitest';
import {filtrarCartoes,type FiltrosKanban} from '@/app/(app)/crm/atendimento/kanban-filtros';
import type {CartaoConversa} from '@/lib/whatsapp-kanban';

function cartao(telefone:string,nome:string,responsavelId:number|null,classificado:boolean):CartaoConversa{
 return {telefone,nome,ultimaMensagem:'oi',revisao:1,classificado,estado:{versao:1,etapa:'novas',responsavelId,responsavelNome:responsavelId?'Ana':'Sem responsável',proximaAcao:'x'}};
}
const A=cartao('5592999990001','JOSÉ RIBAMAR',null,false);
const B=cartao('5592988887777','Maria Souza',7,true);
const C=cartao('5592977776666','Carlos',8,false);
const todos=[A,B,C];
const base:FiltrosKanban={busca:'',responsavel:'todos',soSemClassificacao:false};

describe('filtrarCartoes',()=>{
 it('busca por nome ignora acento e caixa',()=>{expect(filtrarCartoes(todos,{...base,busca:'jose'})).toEqual([A]);});
 it('busca com dígitos casa pelo telefone',()=>{expect(filtrarCartoes(todos,{...base,busca:'9999'})).toEqual([A]);expect(filtrarCartoes(todos,{...base,busca:'+55 (92) 98888'})).toEqual([B]);});
 it('busca em branco não filtra',()=>{expect(filtrarCartoes(todos,{...base,busca:'   '})).toEqual(todos);});
 it('ninguem só devolve sem responsável',()=>{expect(filtrarCartoes(todos,{...base,responsavel:'ninguem'})).toEqual([A]);});
 it('número filtra pelo responsável',()=>{expect(filtrarCartoes(todos,{...base,responsavel:7})).toEqual([B]);});
 it('soSemClassificacao devolve só os não classificados',()=>{expect(filtrarCartoes(todos,{...base,soSemClassificacao:true})).toEqual([A,C]);});
 it('combina com E',()=>{expect(filtrarCartoes(todos,{busca:'a',responsavel:8,soSemClassificacao:true})).toEqual([C]);expect(filtrarCartoes(todos,{busca:'maria',responsavel:8,soSemClassificacao:false})).toEqual([]);});
});
