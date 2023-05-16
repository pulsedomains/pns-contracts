import { namehash } from 'ethers/lib/utils'
import { ethers, network } from 'hardhat'
import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { keccak256 } from 'js-sha3'
import { ZERO_ADDRESS } from '../constants'
import { computeInterfaceId } from '../helpers'

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { getNamedAccounts, deployments } = hre
  const { owner } = await getNamedAccounts()

  const registry = await ethers.getContract('ENSRegistry', owner)
  const root = await ethers.getContract('Root', owner)
  const registrar = await ethers.getContract(
    'BaseRegistrarImplementation',
    owner,
  )
  const nameWrapper = await ethers.getContract('NameWrapper', owner)
  const controller = await ethers.getContract('ETHRegistrarController', owner)
  const resolver = await ethers.getContract('PublicResolver')
  const bulkRenewal = await ethers.getContract('StaticBulkRenewal')

  const tx1 = await registrar.setResolver(resolver.address)
  console.log(
    `Setting resolver for .pls to PublicResolver (tx: ${tx1.hash})...`,
  )
  await tx1.wait()

  const ownerOfResolver = await registry.owner(namehash('resolver'))
  if (ownerOfResolver == ZERO_ADDRESS) {
    const tx = await root.setSubnodeOwner('0x' + keccak256('resolver'), owner)
    console.log(
      `Setting owner of resolver.pls to owner on registry (tx: ${tx.hash})...`,
    )
    await tx.wait()
  } else if (ownerOfResolver != owner) {
    console.log(
      'resolver.pls is not owned by the owner address, not setting resolver',
    )
    return
  }

  const tx2 = await registry.setResolver(namehash('resolver'), resolver.address)
  console.log(
    `Setting resolver for resolver.pls to PublicResolver (tx: ${tx2.hash})...`,
  )
  await tx2.wait()

  const tx3 = await resolver['setAddr(bytes32,address)'](
    namehash('resolver'),
    resolver.address,
  )
  console.log(
    `Setting address for resolver.pls to PublicResolver (tx: ${tx3.hash})...`,
  )
  await tx3.wait()

  const providerWithEns = new ethers.providers.StaticJsonRpcProvider(
    network.name === 'mainnet'
      ? 'https://rpc.mainnet.pulsechain.com'
      : 'https://rpc.v4.testnet.pulsechain.com',
    {
      chainId: network.name === 'mainnet' ? 369 : 943,
      name: 'pulse',
      ensAddress: registry.address,
    },
  )

  const resolverAddr = await providerWithEns.getResolver('pls')
  if (resolverAddr === null) {
    console.log('No resolver set for .pls not setting interface')
    return
  }

  const tx4 = await root.setSubnodeOwner('0x' + keccak256('pls'), owner)
  console.log(`Temporarily setting owner of pls to owner  (tx: ${tx4.hash})...`)
  await tx4.wait()

  const iNameWrapper = await computeInterfaceId(deployments, 'NameWrapper')
  const tx5 = await resolver.setInterface(
    namehash('pls'),
    iNameWrapper,
    nameWrapper.address,
  )
  console.log(
    `Setting NameWrapper interface ID ${iNameWrapper} on .pls resolver (tx: ${tx5.hash})...`,
  )
  await tx5.wait()

  const iRegistrarController = await computeInterfaceId(
    deployments,
    'IETHRegistrarController',
  )
  const tx6 = await resolver.setInterface(
    namehash('pls'),
    iRegistrarController,
    controller.address,
  )
  console.log(
    `Setting IETHRegistrarController interface ID ${iRegistrarController} on .pls resolver (tx: ${tx6.hash})...`,
  )
  await tx6.wait()

  const iBulkRenewal = await computeInterfaceId(deployments, 'IBulkRenewal')
  const tx7 = await resolver.setInterface(
    namehash('pls'),
    iBulkRenewal,
    bulkRenewal.address,
  )
  console.log(
    `Setting BulkRenewal interface ID ${iBulkRenewal} on .pls resolver (tx: ${tx7.hash})...`,
  )
  await tx7.wait()

  const tx8 = await root.setSubnodeOwner(
    '0x' + keccak256('pls'),
    registrar.address,
  )
  console.log(`Set owner of pls back to registrar (tx: ${tx8.hash})...`)
  await tx8.wait()

  return true
}

func.id = 'final-setup'
func.tags = ['FinalSetup']
func.dependencies = [
  'ENSRegistry',
  'BaseRegistrarImplementation',
  'NameWrapper',
  'ETHRegistrarController',
  'PublicResolver',
]

export default func
