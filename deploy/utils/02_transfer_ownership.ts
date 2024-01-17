import { ethers } from 'hardhat'
import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { getNamedAccounts } = hre
  const { owner } = await getNamedAccounts()

  const root = await ethers.getContract('Root', owner)
  let tx = await root.transferOwnership(
    '0x9360B8D341923Ae9771Cf15cC8816c56D752F8b8',
  )
  console.log(`Transferring Root owner (tx: ${tx.hash})`)
  await tx.wait()

  const baseRegistrarImpl = await ethers.getContract(
    'BaseRegistrarImplementation',
    owner,
  )
  tx = await baseRegistrarImpl.transferOwnership(
    '0x9360B8D341923Ae9771Cf15cC8816c56D752F8b8',
  )
  console.log(`Transferring BaseRegistrarImplementation owner (tx: ${tx.hash})`)
  await tx.wait()

  const reserveRegistrar = await ethers.getContract('ReverseRegistrar', owner)
  tx = await reserveRegistrar.transferOwnership(
    '0x9360B8D341923Ae9771Cf15cC8816c56D752F8b8',
  )
  console.log(`Transferring ReverseRegistrar owner (tx: ${tx.hash})`)
  await tx.wait()

  const universalResolver = await ethers.getContract('UniversalResolver', owner)
  tx = await universalResolver.transferOwnership(
    '0x9360B8D341923Ae9771Cf15cC8816c56D752F8b8',
  )
  console.log(`Transferring UniversalResolver owner (tx: ${tx.hash})`)
  await tx.wait()

  const ownedResolver = await ethers.getContract('OwnedResolver', owner)
  tx = await ownedResolver.transferOwnership(
    '0x9360B8D341923Ae9771Cf15cC8816c56D752F8b8',
  )
  console.log(`Transferring OwnedResolver owner (tx: ${tx.hash})`)
  await tx.wait()

  const nameWrapper = await ethers.getContract('NameWrapper', owner)
  tx = await nameWrapper.transferOwnership(
    '0x9360B8D341923Ae9771Cf15cC8816c56D752F8b8',
  )
  console.log(`Transferring NameWrapper owner (tx: ${tx.hash})`)
  await tx.wait()

  const controller = await ethers.getContract('ETHRegistrarController', owner)
  tx = await controller.transferOwnership(
    '0x9360B8D341923Ae9771Cf15cC8816c56D752F8b8',
  )
  console.log(`Transferring ETHRegistrarController owner (tx: ${tx.hash})`)
  await tx.wait()
}

func.id = 'transfer-ownership'
func.tags = ['TransferOwnership']
func.dependencies = ['ETHRegistrarController', 'NameWrapper']

export default func
