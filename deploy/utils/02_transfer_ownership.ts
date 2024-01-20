import { ethers } from 'hardhat'
import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { getNamedAccounts } = hre
  const { owner } = await getNamedAccounts()

  let tx

  // const root = await ethers.getContract('Root', owner)
  // let tx = await root.transferOwnership(
  //   '0x0Bd898b04BA8F8dCBd9beEd635c39aB32ea90d3D',
  // )
  // console.log(`Transferring Root owner (tx: ${tx.hash})`)
  // await tx.wait()

  // const baseRegistrarImpl = await ethers.getContract(
  //   'BaseRegistrarImplementation',
  //   owner,
  // )
  // tx = await baseRegistrarImpl.transferOwnership(
  //   '0x0Bd898b04BA8F8dCBd9beEd635c39aB32ea90d3D',
  // )
  // console.log(`Transferring BaseRegistrarImplementation owner (tx: ${tx.hash})`)
  // await tx.wait()

  // const reserveRegistrar = await ethers.getContract('ReverseRegistrar', owner)
  // tx = await reserveRegistrar.transferOwnership(
  //   '0x0Bd898b04BA8F8dCBd9beEd635c39aB32ea90d3D',
  // )
  // console.log(`Transferring ReverseRegistrar owner (tx: ${tx.hash})`)
  // await tx.wait()

  // const universalResolver = await ethers.getContract('UniversalResolver', owner)
  // tx = await universalResolver.transferOwnership(
  //   '0x0Bd898b04BA8F8dCBd9beEd635c39aB32ea90d3D',
  // )
  // console.log(`Transferring UniversalResolver owner (tx: ${tx.hash})`)
  // await tx.wait()

  // const ownedResolver = await ethers.getContract('OwnedResolver', owner)
  // tx = await ownedResolver.transferOwnership(
  //   '0x0Bd898b04BA8F8dCBd9beEd635c39aB32ea90d3D',
  // )
  // console.log(`Transferring OwnedResolver owner (tx: ${tx.hash})`)
  // await tx.wait()

  // const nameWrapper = await ethers.getContract('NameWrapper', owner)
  // tx = await nameWrapper.transferOwnership(
  //   '0x0Bd898b04BA8F8dCBd9beEd635c39aB32ea90d3D',
  // )
  // console.log(`Transferring NameWrapper owner (tx: ${tx.hash})`)
  // await tx.wait()

  const controller = await ethers.getContract('PLSRegistrarController', owner)
  tx = await controller.transferOwnership(
    '0x0Bd898b04BA8F8dCBd9beEd635c39aB32ea90d3D',
  )
  console.log(`Transferring PLSRegistrarController owner (tx: ${tx.hash})`)
  await tx.wait()
}

func.id = 'transfer-ownership'
func.tags = ['TransferOwnership']
func.dependencies = ['PLSRegistrarController', 'NameWrapper']

export default func
