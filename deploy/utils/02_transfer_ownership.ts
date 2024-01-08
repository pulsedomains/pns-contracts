import { ethers } from 'hardhat'
import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { getNamedAccounts } = hre
  const { owner } = await getNamedAccounts()

  const root = await ethers.getContract('Root', owner)
  let tx = await root.transferOwnership(
    '0xBcf8996B20E92304206cE8643E273Fef5E22f6Ef',
  )
  console.log(`Transferring Root owner (tx: ${tx.hash})`)
  await tx.wait()

  const baseRegistrarImpl = await ethers.getContract(
    'BaseRegistrarImplementation',
    owner,
  )
  tx = await baseRegistrarImpl.transferOwnership(
    '0xBcf8996B20E92304206cE8643E273Fef5E22f6Ef',
  )
  console.log(`Transferring BaseRegistrarImplementation owner (tx: ${tx.hash})`)
  await tx.wait()

  const reserveRegistrar = await ethers.getContract('ReverseRegistrar', owner)
  tx = await reserveRegistrar.transferOwnership(
    '0xBcf8996B20E92304206cE8643E273Fef5E22f6Ef',
  )
  console.log(`Transferring ReverseRegistrar owner (tx: ${tx.hash})`)
  await tx.wait()

  const universalResolver = await ethers.getContract('UniversalResolver', owner)
  tx = await universalResolver.transferOwnership(
    '0xBcf8996B20E92304206cE8643E273Fef5E22f6Ef',
  )
  console.log(`Transferring UniversalResolver owner (tx: ${tx.hash})`)
  await tx.wait()

  const ownedResolver = await ethers.getContract('OwnedResolver', owner)
  tx = await ownedResolver.transferOwnership(
    '0xBcf8996B20E92304206cE8643E273Fef5E22f6Ef',
  )
  console.log(`Transferring OwnedResolver owner (tx: ${tx.hash})`)
  await tx.wait()

  const nameWrapper = await ethers.getContract('NameWrapper', owner)
  tx = await nameWrapper.transferOwnership(
    '0xBcf8996B20E92304206cE8643E273Fef5E22f6Ef',
  )
  console.log(`Transferring NameWrapper owner (tx: ${tx.hash})`)
  await tx.wait()

  const controller = await ethers.getContract('ETHRegistrarController', owner)
  tx = await controller.transferOwnership(
    '0xBcf8996B20E92304206cE8643E273Fef5E22f6Ef',
  )
  console.log(`Transferring ETHRegistrarController owner (tx: ${tx.hash})`)
  await tx.wait()
}

func.id = 'transfer-ownership'
func.tags = ['TransferOwnership']
func.dependencies = ['ETHRegistrarController', 'NameWrapper']

export default func
