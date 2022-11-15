import { namehash } from 'ethers/lib/utils'
import { ethers } from 'hardhat'
import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { computeInterfaceId } from '../helpers'

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { getNamedAccounts, deployments } = hre
  const { deploy } = deployments
  const { deployer, owner } = await getNamedAccounts()

  const registry = await ethers.getContract('ENSRegistry', owner)
  const registrar = await ethers.getContract('BaseRegistrarImplementation', owner)
  const nameWrapper = await ethers.getContract('NameWrapper', owner)
  const controller = await ethers.getContract('ETHRegistrarController', owner)
  const resolver = await ethers.getContract('PublicResolver')

  const tx1 = await registrar.setResolver(resolver.address)
  console.log(`Setting resolver for .pls to PublicResolver (tx: ${tx1.hash})...`)
  await tx1.wait()

  const tx2 = await registry.setResolver(namehash('resolver.pls'), resolver.address)
  console.log(`Setting resolver for resolver.pls to PublicResolver (tx: ${tx1.hash})...`)
  await tx2.wait()

  const tx3 = await resolver['setAddr(bytes32,address)'](namehash('resolver.pls'), resolver.address)
  console.log(`Setting address for resolver.pls to PublicResolver (tx: ${tx3.hash})...`)
  await tx3.wait()

  const providerWithEns = new ethers.providers.StaticJsonRpcProvider(
    'https://rpc.v2b.testnet.pulsechain.com',
    { chainId: 941, name: 'tpulse', ensAddress: registry.address },
  )

  const resolverAddr = await providerWithEns.getResolver('pls')
  if (resolverAddr === null) {
    console.log('No resolver set for .pls not setting interface')
    return
  }

  const iNameWrapper = computeInterfaceId(deployments, 'NameWrapper')
  const tx4 = await resolver.setInterface(namehash('pls'), iNameWrapper, nameWrapper.address)
  console.log(`Setting NameWrapper interface ID ${iNameWrapper} on .pls resolver (tx: ${tx4.hash})...`)
  await tx4.wait()

  const iRegistrarController = await computeInterfaceId(deployments, 'ETHRegistrarController')
  const tx5 = await resolver.setInterface(namehash('pls'), iRegistrarController, controller.address)
  console.log(`Setting ETHRegistrarController interface ID ${iRegistrarController} on .pls resolver (tx: ${tx5.hash})...`)
  await tx5.wait()

  const iBulkRenewal = await computeInterfaceId(deployments, 'BulkRenewal')
  const tx6 = await resolver.setInterface(namehash('pls'), iBulkRenewal, controller.address)
  console.log(`Setting BulkRenewal interface ID ${iBulkRenewal} on .pls resolver (tx: ${tx6.hash})...`)
  await tx6.wait()

  return true
}

func.id = 'final-setup'
func.tags = ['FinalSetup']
func.dependencies = [
  'ENSRegistry',
  'BaseRegistrarImplementation',
  'NameWrapper',
  'PublicResolver',
  'ETHRegistrarController',
]

export default func
