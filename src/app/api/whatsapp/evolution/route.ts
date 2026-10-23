import {NextResponse} from 'next/server';
import {requireAdmin} from '@/lib/guards';
import {getEvolutionConnectionState,connectEvolutionQR,logoutInstance} from '@/lib/evolution';
const headers={'Cache-Control':'no-store'};
export async function GET(){
 if(!await requireAdmin())return NextResponse.json({error:'Unauthorized'},{status:401,headers});
 return NextResponse.json(await getEvolutionConnectionState(),{headers});
}
export async function POST(req:Request){
 if(!await requireAdmin())return NextResponse.json({error:'Unauthorized'},{status:401,headers});
 const body=await req.json().catch(()=>null);
 if(body?.action==='logout')return NextResponse.json({success:await logoutInstance(),state:'close'},{headers});
 if(body?.action!=='create')return NextResponse.json({error:'Ação inválida.'},{status:400,headers});
 const result=await connectEvolutionQR();
 return NextResponse.json(result,{status:result.error?502:200,headers});
}
